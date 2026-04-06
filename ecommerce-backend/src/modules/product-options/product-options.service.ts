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

@Injectable()
export class ProductOptionsService {
  private readonly logger = new Logger(ProductOptionsService.name);

  constructor(private prisma: PrismaService) {}

  async findAllOptions(storeId: number) {
    const options = await this.prisma.productOption.findMany({
      where: { storeId },
      include: {
        values: {
          select: {
            id: true,
            value: true,
            productId: true,
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
      productsCount: new Set(option.values.map((value) => value.productId)).size,
      usageCount: option.values.length,
      reusableValues: [
        ...new Map(
          option.values.map((value) => [
            value.value.trim().toLowerCase(),
            {
              id: value.id,
              value: value.value,
              productsCount: option.values.filter(
                (entry) =>
                  entry.value.trim().toLowerCase() ===
                  value.value.trim().toLowerCase(),
              ).length,
            },
          ]),
        ).values(),
      ],
    }));
  }

  async createOption(storeId: number, dto: CreateProductOptionDto) {
    const normalizedName = dto.name.trim();

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
    const normalizedName = dto.name.trim();
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

  async addValueToProduct(
    storeId: number,
    productId: number,
    dto: AddProductOptionValueDto,
  ) {
    const normalizedValue = dto.value.trim();

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
    const nextValue = dto.nextValue.trim();

    if (
      currentValue.localeCompare(nextValue, undefined, {
        sensitivity: 'accent',
      }) === 0
    ) {
      throw new BadRequestException('Value name did not change');
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
    const normalizedValue = value.trim();
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
