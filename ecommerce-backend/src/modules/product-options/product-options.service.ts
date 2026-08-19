import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductOptionDto } from './dto/create-product-option.dto';
import { AddProductOptionValueDto } from './dto/add-product-option-value.dto';
import { UpdateProductOptionDto } from './dto/update-product-option.dto';
import { RenameProductOptionValueDto } from './dto/rename-product-option-value.dto';
import { CreateReusableOptionValueDto } from './dto/create-reusable-option-value.dto';
import { ReorderReusableOptionValuesDto } from './dto/reorder-reusable-option-values.dto';
import { normalizeDisplayText } from '../../common/utils/display-text.util';
import { normalizeBrandDisplayName, normalizeBrandKey } from '../../common/utils/brand.util';

@Injectable()
export class ProductOptionsService {
  private readonly logger = new Logger(ProductOptionsService.name);

  constructor(private prisma: PrismaService) {}

  private normalizeOptionName(name: string | undefined | null) {
    const normalizedName = normalizeDisplayText(name);

    if (!normalizedName) {
      throw new BadRequestException('Product option name is required');
    }

    return normalizedName;
  }

  private normalizeOptionValue(optionName: string, value: string) {
    return ['marca', 'marcas'].includes(normalizeBrandKey(optionName))
      ? normalizeBrandDisplayName(value)
      : normalizeDisplayText(value);
  }

  async findAllOptions(storeId: number) {
    const options = await this.prisma.productOption.findMany({
      where: { storeId },
      include: {
        reusableValues: {
          orderBy: [{ position: 'asc' }, { value: 'asc' }],
        },
        values: {
          where: {
            product: {
              deletedAt: null,
            },
          },
          select: {
            id: true,
            value: true,
            productId: true,
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                variants: {
                  where: { deletedAt: null },
                  select: { id: true },
                },
              },
            },
          },
          orderBy: {
            value: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return options.map((option) => ({
      id: option.id,
      name: option.name,
      storeId: option.storeId,
      createdAt: option.createdAt,
      updatedAt: option.updatedAt,
      attributeType: option.attributeType,
      productsCount: new Set(option.values.map((value) => value.productId)).size,
      usageCount: option.values.length,
      reusableValues: this.mergeReusableValues(option.reusableValues, option.values),
      products: this.buildAssociatedProducts(option.values),
    }));
  }

  private buildAssociatedProducts(
    productValues: Array<{
      productId: number;
      product: { id: number; title: string; slug: string; variants: Array<{ id: number }> };
    }>,
  ) {
    const products = new Map<number, { id: number; title: string; slug: string; variantsCount: number }>();

    for (const entry of productValues) {
      products.set(entry.productId, {
        id: entry.product.id,
        title: entry.product.title,
        slug: entry.product.slug,
        variantsCount: entry.product.variants.length,
      });
    }

    return [...products.values()].sort((a, b) => a.title.localeCompare(b.title));
  }

  private mergeReusableValues(
    reusableValues: Array<{ id: number; value: string; position: number; visualColor: string | null }>,
    productValues: Array<{ id: number; value: string; productId: number }>,
  ) {
    const usageByValue = new Map<string, { value: string; products: Set<number>; fallbackId: number }>();

    for (const value of productValues) {
      const key = value.value.trim().toLowerCase();
      const current =
        usageByValue.get(key) ??
        { value: value.value, products: new Set<number>(), fallbackId: value.id };
      current.products.add(value.productId);
      usageByValue.set(key, current);
    }

    const merged = reusableValues.map((value) => {
      const usage = usageByValue.get(value.value.trim().toLowerCase());
      return {
        id: value.id,
        value: value.value,
        productsCount: usage?.products.size ?? 0,
        position: value.position,
        visualColor: value.visualColor,
      };
    });

    const definedKeys = new Set(reusableValues.map((value) => value.value.trim().toLowerCase()));
    for (const [key, usage] of usageByValue.entries()) {
      if (definedKeys.has(key)) continue;
      merged.push({
        id: usage.fallbackId,
        value: usage.value,
        productsCount: usage.products.size,
        position: merged.length,
        visualColor: null,
      });
    }

    return merged.sort((a, b) => a.position - b.position || a.value.localeCompare(b.value));
  }

  async createOption(storeId: number, dto: CreateProductOptionDto) {
    const normalizedName = this.normalizeOptionName(dto.name);

    const existing = await this.prisma.productOption.findFirst({
      where: {
        storeId,
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Product option already exists');
    }

    try {
      return await this.prisma.productOption.create({
        data: {
          storeId,
          name: normalizedName,
          attributeType: dto.attributeType ?? 'text',
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, {
        action: 'createOption',
        storeId,
        optionId: undefined,
      });
      throw error;
    }
  }

  async updateOption(
    storeId: number,
    optionId: number,
    dto: UpdateProductOptionDto,
  ) {
    const normalizedName = this.normalizeOptionName(dto.name);
    const option = await this.prisma.productOption.findFirst({
      where: {
        id: optionId,
        storeId,
      },
      select: {
        id: true,
      },
    });

    if (!option) {
      throw new NotFoundException('Product option not found');
    }

    const existing = await this.prisma.productOption.findFirst({
      where: {
        storeId,
        id: {
          not: optionId,
        },
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new BadRequestException('Product option already exists');
    }

    try {
      return await this.prisma.productOption.update({
        where: {
          id: optionId,
        },
        data: {
          name: normalizedName,
          attributeType: dto.attributeType ?? 'text',
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, {
        action: 'updateOption',
        storeId,
        optionId,
      });
      throw error;
    }
  }

  async createReusableValue(
    storeId: number,
    optionId: number,
    dto: CreateReusableOptionValueDto,
  ) {
    const option = await this.prisma.productOption.findFirst({
      where: { id: optionId, storeId },
      select: { id: true, name: true },
    });

    if (!option) {
      throw new NotFoundException('Product option not found');
    }

    const normalizedValue = this.normalizeOptionValue(option.name, dto.value);
    if (!normalizedValue) {
      throw new BadRequestException('Product option value is required');
    }

    const lastValue = await this.prisma.productOptionReusableValue.findFirst({
      where: { productOptionId: optionId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const existingValue = await this.prisma.productOptionReusableValue.findFirst({
      where: {
        productOptionId: optionId,
        value: {
          equals: normalizedValue,
          mode: 'insensitive',
        },
      },
    });

    if (existingValue) {
      return existingValue;
    }

    return this.prisma.productOptionReusableValue.create({
      data: {
        productOptionId: optionId,
        value: normalizedValue,
        visualColor: dto.visualColor?.trim() || null,
        position: dto.position ?? (lastValue ? lastValue.position + 1 : 0),
      },
    });
  }

  async reorderReusableValues(
    storeId: number,
    optionId: number,
    dto: ReorderReusableOptionValuesDto,
  ) {
    const option = await this.prisma.productOption.findFirst({
      where: { id: optionId, storeId },
      select: { id: true },
    });

    if (!option) {
      throw new NotFoundException('Product option not found');
    }

    await this.prisma.$transaction(
      dto.valueIds.map((id, position) =>
        this.prisma.productOptionReusableValue.updateMany({
          where: { id, productOptionId: optionId },
          data: { position },
        }),
      ),
    );

    return { reordered: true };
  }

  async deleteOption(storeId: number, optionId: number, force = false) {
    const option = await this.prisma.productOption.findFirst({
      where: {
        id: optionId,
        storeId,
      },
      include: {
        values: {
          select: {
            id: true,
            productId: true,
          },
        },
      },
    });

    if (!option) {
      throw new NotFoundException('Product option not found');
    }

    const productsCount = new Set(option.values.map((value) => value.productId)).size;

    if (productsCount > 0 && !force) {
      throw new BadRequestException(
        `Product option is still used by ${productsCount} product(s)`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (option.values.length > 0) {
        await tx.productOptionValue.deleteMany({
          where: {
            productOptionId: optionId,
          },
        });
      }

      await tx.productOption.delete({
        where: {
          id: optionId,
        },
      });
    });

    return {
      deleted: true,
      optionId,
      removedValues: option.values.length,
      affectedProducts: productsCount,
    };
  }

  async unlinkOptionFromProduct(storeId: number, optionId: number, productId: number) {
    const option = await this.prisma.productOption.findFirst({
      where: { id: optionId, storeId },
      select: { id: true, name: true },
    });

    if (!option) {
      throw new NotFoundException('Product option not found');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, storeId, deletedAt: null },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const deleted = await this.prisma.productOptionValue.deleteMany({
      where: { productOptionId: optionId, productId },
    });

    return { unlinked: true, removedValues: deleted.count };
  }

  async addValueToProduct(
    storeId: number,
    productId: number,
    dto: AddProductOptionValueDto,
  ) {
    const [product, option] = await Promise.all([
      this.prisma.product.findFirst({
        where: {
          id: productId,
          storeId,
        },
        select: { id: true },
      }),
      this.prisma.productOption.findFirst({
        where: {
          id: dto.productOptionId,
          storeId,
        },
        select: { id: true, name: true },
      }),
    ]);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!option) {
      throw new NotFoundException('Product option not found');
    }

    const normalizedValue = this.normalizeOptionValue(option.name, dto.value);
    if (!normalizedValue) {
      throw new BadRequestException('Product option value is required');
    }

    const existing = await this.prisma.productOptionValue.findFirst({
      where: {
        productId,
        productOptionId: dto.productOptionId,
        value: {
          equals: normalizedValue,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Product option value already exists');
    }

    try {
      return await this.prisma.productOptionValue.create({
        data: {
          productId,
          productOptionId: dto.productOptionId,
          value: normalizedValue,
        },
        include: {
          productOption: true,
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      });
    } catch (error) {
      this.handleKnownPrismaError(error, {
        action: 'addValueToProduct',
        storeId,
        optionId: dto.productOptionId,
      });
      throw error;
    }
  }

  async findValuesByProduct(storeId: number, productId: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        storeId,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.productOptionValue.findMany({
      where: {
        productId,
        productOption: {
          storeId,
        },
      },
      include: {
        productOption: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        {
          productOption: {
            name: 'asc',
          },
        },
        {
          value: 'asc',
        },
      ],
    });
  }

  async removeValueFromProduct(
    storeId: number,
    productId: number,
    valueId: number,
  ) {
    const value = await this.prisma.productOptionValue.findFirst({
      where: {
        id: valueId,
        productId,
        productOption: {
          storeId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!value) {
      throw new NotFoundException('Product option value not found');
    }

    return this.prisma.productOptionValue.delete({
      where: {
        id: valueId,
      },
    });
  }

  async renameReusableValue(
    storeId: number,
    optionId: number,
    dto: RenameProductOptionValueDto,
  ) {
    const currentValue = dto.currentValue.trim();
    const option = await this.prisma.productOption.findFirst({
      where: {
        id: optionId,
        storeId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!option) {
      throw new NotFoundException('Product option not found');
    }

    const nextValue = this.normalizeOptionValue(option.name, dto.nextValue);
    if (!currentValue || !nextValue) {
      throw new BadRequestException('Product option value is required');
    }

    if (
      currentValue.localeCompare(nextValue, undefined, {
        sensitivity: 'accent',
      }) === 0
    ) {
      throw new BadRequestException('Value name did not change');
    }

    const currentEntries = await this.prisma.productOptionValue.findMany({
      where: {
        productOptionId: optionId,
        value: {
          equals: currentValue,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        productId: true,
      },
    });

    if (currentEntries.length === 0) {
      throw new NotFoundException('Product option value not found');
    }

    const conflictEntries = await this.prisma.productOptionValue.findMany({
      where: {
        productOptionId: optionId,
        value: {
          equals: nextValue,
          mode: 'insensitive',
        },
        productId: {
          in: currentEntries.map((entry) => entry.productId),
        },
      },
      select: {
        id: true,
        productId: true,
      },
    });

    const conflictProductIds = conflictEntries.map((entry) => entry.productId);

    const result = await this.prisma.$transaction(async (tx) => {
      const deleted = conflictProductIds.length
        ? await tx.productOptionValue.deleteMany({
            where: {
              productOptionId: optionId,
              productId: {
                in: conflictProductIds,
              },
              value: {
                equals: currentValue,
                mode: 'insensitive',
              },
            },
          })
        : { count: 0 };

      const updated = await tx.productOptionValue.updateMany({
        where: {
          productOptionId: optionId,
          value: {
            equals: currentValue,
            mode: 'insensitive',
          },
          productId: conflictProductIds.length
            ? {
                notIn: conflictProductIds,
              }
            : undefined,
        },
        data: {
          value: nextValue,
        },
      });

      await tx.productOptionReusableValue.updateMany({
        where: {
          productOptionId: optionId,
          value: {
            equals: currentValue,
            mode: 'insensitive',
          },
        },
        data: {
          value: nextValue,
        },
      });

      return {
        deletedCount: deleted.count,
        updatedCount: updated.count,
      };
    });

    return {
      renamed: true,
      optionId,
      currentValue,
      nextValue,
      updatedCount: result.updatedCount,
      mergedCount: result.deletedCount,
    };
  }

  async deleteReusableValue(
    storeId: number,
    optionId: number,
    value: string,
    force = false,
  ) {
    const normalizedValue = normalizeDisplayText(value);
    if (!normalizedValue) {
      throw new BadRequestException('Product option value is required');
    }

    const option = await this.prisma.productOption.findFirst({
      where: {
        id: optionId,
        storeId,
      },
      select: {
        id: true,
      },
    });

    if (!option) {
      throw new NotFoundException('Product option not found');
    }

    const usageEntries = await this.prisma.productOptionValue.findMany({
      where: {
        productOptionId: optionId,
        value: {
          equals: normalizedValue,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        productId: true,
      },
    });

    if (usageEntries.length === 0) {
      throw new NotFoundException('Product option value not found');
    }

    const productsCount = new Set(usageEntries.map((entry) => entry.productId)).size;

    if (productsCount > 0 && !force) {
      throw new BadRequestException(
        `Product option value is still used by ${productsCount} product(s)`,
      );
    }

    const deleted = await this.prisma.productOptionValue.deleteMany({
      where: {
        productOptionId: optionId,
        value: {
          equals: normalizedValue,
          mode: 'insensitive',
        },
      },
    });

    await this.prisma.productOptionReusableValue.deleteMany({
      where: {
        productOptionId: optionId,
        value: {
          equals: normalizedValue,
          mode: 'insensitive',
        },
      },
    });

    return {
      deleted: true,
      optionId,
      value: normalizedValue,
      removedValues: deleted.count,
      affectedProducts: productsCount,
    };
  }

  private handleKnownPrismaError(
    error: unknown,
    context: {
      action: string;
      storeId: number;
      optionId?: number;
    },
  ) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException('Product option already exists');
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      this.logger.warn(
        `Foreign key constraint while ${context.action} for storeId=${context.storeId}${context.optionId ? ` optionId=${context.optionId}` : ''}`,
      );
      throw new BadRequestException(
        'Invalid store or product option reference for this tenant',
      );
    }
  }
}
