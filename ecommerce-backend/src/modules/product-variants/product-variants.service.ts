import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class ProductVariantsService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.productVariant.create({
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

    await this.prisma.productVariant.update({
      where: {
        id: variantId,
      },
      data: payload,
    });

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
}
