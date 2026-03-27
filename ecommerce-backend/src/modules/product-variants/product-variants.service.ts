import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class ProductVariantsService {
  constructor(private prisma: PrismaService) {}

  findAll(storeId: number) {
    return this.prisma.productVariant.findMany({
      where: {
        deletedAt: null,
        product: {
          storeId,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        inventories: {
          where: {
            storeId,
          },
        },
      },
      orderBy: [{ productId: 'asc' }, { sku: 'asc' }],
    });
  }

  async create(data: CreateVariantDto, storeId: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: data.productId,
        storeId: storeId,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found in this store');
    }

    await this.ensureSkuAvailableInStore(data.sku, storeId);

    try {
      return await this.prisma.productVariant.create({
        data: {
          productId: data.productId,
          sku: data.sku,
          price: data.price,
          Size: data.Size,
          Color: data.Color,
          weight: data.weight,
          width: data.width,
          height: data.height,
          length: data.length,
          inventories:
            data.inventoryQuantity !== undefined
              ? {
                  create: {
                    storeId,
                    quantity: data.inventoryQuantity,
                  },
                }
              : undefined,
        },
        include: {
          inventories: {
            where: {
              storeId,
            },
          },
        },
      });
    } catch (error) {
      this.handleDuplicateSkuError(error);
      throw error;
    }
  }

  async update(variantId: number, data: UpdateVariantDto, storeId: number) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        deletedAt: null,
        product: {
          storeId,
        },
      },
      include: {
        inventories: {
          where: {
            storeId,
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found in this store');
    }

    const payload: {
      sku?: string;
      price?: number;
      Size?: string | null;
      Color?: string | null;
      weight?: number | null;
      width?: number | null;
      height?: number | null;
      length?: number | null;
    } = {};

    if (data.sku !== undefined) payload.sku = data.sku;
    if (data.price !== undefined) payload.price = data.price;
    if (data.Size !== undefined) payload.Size = data.Size ?? null;
    if (data.Color !== undefined) payload.Color = data.Color ?? null;
    if (data.weight !== undefined) payload.weight = data.weight ?? null;
    if (data.width !== undefined) payload.width = data.width ?? null;
    if (data.height !== undefined) payload.height = data.height ?? null;
    if (data.length !== undefined) payload.length = data.length ?? null;

    if (data.sku !== undefined) {
      await this.ensureSkuAvailableInStore(data.sku, storeId, variantId);
    }

    try {
      await this.prisma.productVariant.update({
        where: {
          id: variantId,
        },
        data: payload,
      });
    } catch (error) {
      this.handleDuplicateSkuError(error);
      throw error;
    }

    if (data.inventoryQuantity !== undefined) {
      await this.prisma.inventory.upsert({
        where: {
          storeId_variantId: {
            storeId,
            variantId,
          },
        },
        update: {
          quantity: data.inventoryQuantity,
        },
        create: {
          storeId,
          variantId,
          quantity: data.inventoryQuantity,
        },
      });
    }

    return this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        deletedAt: null,
        product: {
          storeId,
        },
      },
      include: {
        inventories: {
          where: {
            storeId,
          },
        },
      },
    });
  }

  async remove(variantId: number, storeId: number) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        deletedAt: null,
        product: {
          storeId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found in this store');
    }

    return this.prisma.productVariant.update({
      where: {
        id: variantId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  findByProduct(productId: number, storeId: number) {
    return this.prisma.productVariant.findMany({
      where: {
        productId,
        deletedAt: null,
        product: {
          storeId: storeId,
        },
      },
      include: {
        inventories: {
          where: {
            storeId,
          },
        },
      },
    });
  }

  private handleDuplicateSkuError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target) ? error.meta.target : [];

      if (target.includes('sku')) {
        throw new BadRequestException('SKU already exists');
      }
    }
  }

  private async ensureSkuAvailableInStore(
    sku: string,
    storeId: number,
    excludeVariantId?: number,
  ) {
    const existing = await this.prisma.productVariant.findFirst({
      where: {
        sku,
        deletedAt: null,
        product: {
          storeId,
        },
        id:
          excludeVariantId === undefined
            ? undefined
            : {
                not: excludeVariantId,
              },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new BadRequestException('SKU already exists');
    }
  }
}
