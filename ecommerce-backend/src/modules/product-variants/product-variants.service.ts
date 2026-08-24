import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CatalogAuditService,
  type CatalogAuditActor,
} from '../catalog-audit/catalog-audit.service';
import { InventoryMovementService } from '../inventory-lock/inventory-movement.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import {
  convertCashInputToBasePrice,
  resolveCashPriceInputSettings,
} from '../../common/price-input-mode';
import { normalizeDisplayText } from '../../common/utils/display-text.util';
import { isGiftCardProduct } from '../../common/gift-card-product';

const normalizeNullableDisplayText = (value?: string | null) => {
  const normalized = normalizeDisplayText(value);
  return normalized || null;
};

@Injectable()
export class ProductVariantsService {
  constructor(
    private prisma: PrismaService,
    private catalogAudit: CatalogAuditService,
    private movements: InventoryMovementService,
  ) {}

  private normalizeWeightGrams(data: {
    weightGrams?: number | null;
    weight?: number | null;
  }) {
    const directWeightGrams = Number(data.weightGrams ?? 0);
    if (Number.isFinite(directWeightGrams) && directWeightGrams > 0) {
      return directWeightGrams;
    }

    const legacyWeight = Number(data.weight ?? 0);
    if (Number.isFinite(legacyWeight) && legacyWeight > 0) {
      return Math.round(legacyWeight * 1000);
    }

    return null;
  }

  private normalizeDimensionCm(
    preferred?: number | null,
    legacy?: number | null,
  ) {
    const preferredValue = Number(preferred ?? 0);
    if (Number.isFinite(preferredValue) && preferredValue > 0) {
      return preferredValue;
    }

    const legacyValue = Number(legacy ?? 0);
    if (Number.isFinite(legacyValue) && legacyValue > 0) {
      return legacyValue;
    }

    return null;
  }

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

  async create(data: CreateVariantDto, storeId: number, actor?: CatalogAuditActor) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: data.productId,
        storeId: storeId,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found in this store');
    }

    const sku = data.sku.trim();
    if (!sku) {
      throw new BadRequestException('Each variant requires a SKU');
    }

    await this.ensureSkuAvailableInStore(sku, storeId);

    try {
      const weightGrams = this.normalizeWeightGrams(data);
      const packageWidthCm = this.normalizeDimensionCm(
        data.packageWidthCm,
        data.width,
      );
      const packageHeightCm = this.normalizeDimensionCm(
        data.packageHeightCm,
        data.height,
      );
      const packageLengthCm = this.normalizeDimensionCm(
        data.packageLengthCm,
        data.length,
      );
      const priceInputSettings = await this.resolvePriceInputSettings(storeId);
      const effectivePriceInputSettings = isGiftCardProduct(product.title, sku)
        ? { enabled: false, discountPercentage: 0, multiplier: 1 }
        : priceInputSettings;

      return await this.prisma.$transaction(async (tx) => {
        const variant = await tx.productVariant.create({
          data: {
            productId: data.productId,
            sku,
            price: convertCashInputToBasePrice(data.price, effectivePriceInputSettings),
            Size: normalizeNullableDisplayText(data.Size),
            Color: normalizeNullableDisplayText(data.Color),
            waistSize: normalizeNullableDisplayText(data.waistSize),
            weight: weightGrams !== null ? Number((weightGrams / 1000).toFixed(3)) : data.weight,
            weightGrams,
            width: packageWidthCm ?? data.width,
            packageWidthCm,
            height: packageHeightCm ?? data.height,
            packageHeightCm,
            length: packageLengthCm ?? data.length,
            packageLengthCm,
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

        if (variant.inventories[0]) {
          await this.movements.recordCreatedTx(tx, variant.inventories[0], {
            type: 'INITIAL_LOAD',
            origin: 'variant.create',
            actor,
            referenceType: 'variant',
            referenceId: variant.id,
          });
        }

        await this.catalogAudit.create({
          storeId,
          productId: variant.productId,
          variantId: variant.id,
          action: 'variant.created',
          entity: 'variant',
          entityId: variant.id,
          actor,
          after: variant,
        }, tx);

        return variant;
      });
    } catch (error) {
      this.handleDuplicateSkuError(error);
      throw error;
    }
  }

  async update(
    variantId: number,
    data: UpdateVariantDto,
    storeId: number,
    actor?: CatalogAuditActor,
  ) {
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
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
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
      waistSize?: string | null;
      weight?: number | null;
      weightGrams?: number | null;
      width?: number | null;
      packageWidthCm?: number | null;
      height?: number | null;
      packageHeightCm?: number | null;
      length?: number | null;
      packageLengthCm?: number | null;
    } = {};

    if (data.sku !== undefined) {
      const sku = data.sku.trim();
      if (!sku) {
        throw new BadRequestException('Each variant requires a SKU');
      }
      payload.sku = sku;
    }
    if (data.price !== undefined) {
      const priceInputSettings = await this.resolvePriceInputSettings(storeId);
      const effectivePriceInputSettings = isGiftCardProduct(
        variant.product.title,
        data.sku ?? variant.sku,
      )
        ? { enabled: false, discountPercentage: 0, multiplier: 1 }
        : priceInputSettings;
      payload.price = convertCashInputToBasePrice(
        data.price,
        effectivePriceInputSettings,
      );
    }
    if (data.Size !== undefined) payload.Size = normalizeNullableDisplayText(data.Size);
    if (data.Color !== undefined) payload.Color = normalizeNullableDisplayText(data.Color);
    if (data.waistSize !== undefined) payload.waistSize = normalizeNullableDisplayText(data.waistSize);
    if (data.weight !== undefined || data.weightGrams !== undefined) {
      const weightGrams = this.normalizeWeightGrams(data);
      payload.weightGrams = weightGrams;
      payload.weight =
        weightGrams !== null ? Number((weightGrams / 1000).toFixed(3)) : null;
    }
    if (data.width !== undefined || data.packageWidthCm !== undefined) {
      const packageWidthCm = this.normalizeDimensionCm(
        data.packageWidthCm,
        data.width,
      );
      payload.packageWidthCm = packageWidthCm;
      payload.width = packageWidthCm;
    }
    if (data.height !== undefined || data.packageHeightCm !== undefined) {
      const packageHeightCm = this.normalizeDimensionCm(
        data.packageHeightCm,
        data.height,
      );
      payload.packageHeightCm = packageHeightCm;
      payload.height = packageHeightCm;
    }
    if (data.length !== undefined || data.packageLengthCm !== undefined) {
      const packageLengthCm = this.normalizeDimensionCm(
        data.packageLengthCm,
        data.length,
      );
      payload.packageLengthCm = packageLengthCm;
      payload.length = packageLengthCm;
    }

    if (data.sku !== undefined) {
      await this.ensureSkuAvailableInStore(data.sku.trim(), storeId, variantId);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.productVariant.update({
          where: {
            id: variantId,
          },
          data: payload,
        });

        if (data.inventoryQuantity !== undefined) {
          if (variant.inventories[0]) {
            await this.movements.setQuantityTx(tx, storeId, variantId, data.inventoryQuantity, {
              type: 'MANUAL_ADJUSTMENT',
              origin: 'variant.update',
              actor,
              referenceType: 'variant',
              referenceId: variantId,
            });
          } else {
            const inventory = await tx.inventory.create({ data: { storeId, variantId, quantity: data.inventoryQuantity } });
            await this.movements.recordCreatedTx(tx, inventory, {
              type: 'INITIAL_LOAD',
              origin: 'variant.update',
              actor,
              referenceType: 'variant',
              referenceId: variantId,
            });
          }
        }

        const after = await tx.productVariant.findFirst({
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
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
        });

        await this.catalogAudit.create({
          storeId,
          productId: variant.productId,
          variantId,
          action: 'variant.updated',
          entity: 'variant',
          entityId: variantId,
          actor,
          before: variant,
          after,
          metadata: {
            fields: Object.keys(payload),
            inventoryChanged: data.inventoryQuantity !== undefined,
          },
        }, tx);

        return after;
      });
    } catch (error) {
      this.handleDuplicateSkuError(error);
      throw error;
    }
  }

  async remove(variantId: number, storeId: number, actor?: CatalogAuditActor) {
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
        productId: true,
        sku: true,
        price: true,
        Size: true,
        Color: true,
        waistSize: true,
        deletedAt: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found in this store');
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedAt = new Date();
      const removed = await tx.productVariant.update({
        where: {
          id: variantId,
        },
        data: {
          deletedAt,
        },
      });

      await this.catalogAudit.create({
        storeId,
        productId: variant.productId,
        variantId,
        action: 'variant.deleted',
        entity: 'variant',
        entityId: variantId,
        actor,
        before: variant,
        after: removed,
      }, tx);

      return removed;
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

  private async resolvePriceInputSettings(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        name: true,
        domain: true,
        storefrontConfig: true,
        bankTransferDiscountPercentage: true,
      },
    });

    return resolveCashPriceInputSettings(store);
  }
}
