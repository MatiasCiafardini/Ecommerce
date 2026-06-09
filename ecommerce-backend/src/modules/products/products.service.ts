import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SaveProductCompleteDto } from './dto/save-product-complete.dto';
import { generateSlug } from '../../common/utils/slug.util';
import { normalizeDisplayText } from '../../common/utils/display-text.util';
import {
  convertCashInputToBasePrice,
  resolveCashPriceInputSettings,
  type CashPriceInputSettings,
} from '../../common/price-input-mode';

const normalizeNullableDisplayText = (value?: string | null) => {
  const normalized = normalizeDisplayText(value);
  return normalized || null;
};

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateProductDto, storeId: number) {
    const title = normalizeDisplayText(data.title);
    if (!title) {
      throw new BadRequestException('Product title is required');
    }

    const slug = await this.resolveAvailableSlug(generateSlug(title), storeId);

    return this.prisma.product.create({
      data: {
        title,
        description: data.description,
        slug,
        published: data.published ?? false,
        weightGrams: data.weightGrams,
        packageHeightCm: data.packageHeightCm,
        packageWidthCm: data.packageWidthCm,
        packageLengthCm: data.packageLengthCm,
        packagingTemplateId: data.packagingTemplateId?.trim() || null,
        storeId,
      },
    });
  }

  findAll(storeId: number, search?: string, rawLimit?: string | number) {
    const requestedLimit = Number(rawLimit ?? 0);
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(Math.trunc(requestedLimit), 120)
        : undefined;

    return this.prisma.product.findMany({
      where: this.buildFindAllWhere(storeId, search),
      take: limit,
      orderBy: {
        title: 'asc',
      },
      include: {
        variants: {
          where: {
            deletedAt: null,
          },
          include: {
            inventories: true,
          },
        },
        images: true,
        categories: {
          where: {
            category: {
              deletedAt: null,
            },
          },
          include: {
            category: true,
          },
        },
      },
    });
  }

  async findAdminCatalog(
    storeId: number,
    query: {
      search?: string;
      categoryId?: string;
      status?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    const page = this.normalizePositiveInt(query.page, 1, 1, 10_000);
    const pageSize = this.normalizePositiveInt(query.pageSize, 80, 20, 120);
    const where = this.buildAdminCatalogWhere(storeId, query);
    const metricsWhere = {
      storeId,
      deletedAt: null,
    } satisfies Prisma.ProductWhereInput;
    const hasStockWhere = this.buildHasStockWhere(storeId);
    const withoutStockWhere = this.buildWithoutStockWhere(storeId);

    const [items, total, totalProducts, published, draft, withoutStock] =
      await Promise.all([
        this.prisma.product.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: {
            title: 'asc',
          },
          select: {
            id: true,
            title: true,
            slug: true,
            published: true,
            description: true,
            weightGrams: true,
            packageHeightCm: true,
            packageWidthCm: true,
            packageLengthCm: true,
            packagingTemplateId: true,
            images: {
              orderBy: [{ position: 'asc' }, { id: 'asc' }],
              take: 1,
              select: {
                id: true,
                url: true,
                position: true,
                offsetX: true,
                offsetY: true,
                zoom: true,
              },
            },
            categories: {
              where: {
                category: {
                  deletedAt: null,
                },
              },
              select: {
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            variants: {
              where: {
                deletedAt: null,
              },
              select: {
                id: true,
                sku: true,
                price: true,
                inventories: {
                  where: {
                    storeId,
                  },
                  select: {
                    quantity: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.product.count({ where }),
        this.prisma.product.count({ where: metricsWhere }),
        this.prisma.product.count({
          where: {
            ...metricsWhere,
            published: true,
            ...hasStockWhere,
          },
        }),
        this.prisma.product.count({
          where: {
            ...metricsWhere,
            published: false,
            ...hasStockWhere,
          },
        }),
        this.prisma.product.count({
          where: {
            ...metricsWhere,
            ...withoutStockWhere,
          },
        }),
      ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      metrics: {
        total: totalProducts,
        published,
        draft,
        withoutStock,
      },
    };
  }

  async findOne(productId: number, storeId: number) {
    const product = await this.findById(this.prisma, productId, storeId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private buildFindAllWhere(storeId: number, rawSearch?: string): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {
      storeId,
      deletedAt: null,
    };
    const search = rawSearch?.trim().slice(0, 80);

    if (!search) {
      return where;
    }

    const contains = {
      contains: search,
      mode: 'insensitive',
    } satisfies Prisma.StringFilter;

    where.AND = [
      {
        OR: [
          { title: contains },
          { slug: contains },
          { description: contains },
          {
            categories: {
              some: {
                category: {
                  storeId,
                  deletedAt: null,
                  OR: [{ name: contains }, { slug: contains }],
                },
              },
            },
          },
          {
            optionValues: {
              some: {
                value: contains,
                productOption: {
                  storeId,
                },
              },
            },
          },
          {
            variants: {
              some: {
                deletedAt: null,
                OR: [{ sku: contains }, { Color: contains }, { Size: contains }],
              },
            },
          },
        ],
      },
    ];

    return where;
  }

  private buildAdminCatalogWhere(
    storeId: number,
    query: {
      search?: string;
      categoryId?: string;
      status?: string;
    },
  ): Prisma.ProductWhereInput {
    const where = this.buildFindAllWhere(storeId, query.search);
    const categoryId = Number(query.categoryId);
    const status = query.status?.trim();
    const andConditions = Array.isArray(where.AND)
      ? [...where.AND]
      : where.AND
        ? [where.AND]
        : [];

    if (Number.isFinite(categoryId) && categoryId > 0) {
      andConditions.push({
        categories: {
          some: {
            categoryId: Math.trunc(categoryId),
            category: {
              storeId,
              deletedAt: null,
            },
          },
        },
      });
    }

    if (status === 'published') {
      where.published = true;
      andConditions.push(this.buildHasStockWhere(storeId));
    } else if (status === 'draft') {
      where.published = false;
      andConditions.push(this.buildHasStockWhere(storeId));
    } else if (status === 'without-stock') {
      andConditions.push(this.buildWithoutStockWhere(storeId));
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    return where;
  }

  private buildHasStockWhere(storeId: number): Prisma.ProductWhereInput {
    return {
      variants: {
        some: {
          deletedAt: null,
          inventories: {
            some: {
              storeId,
              quantity: {
                gt: 0,
              },
            },
          },
        },
      },
    };
  }

  private buildWithoutStockWhere(storeId: number): Prisma.ProductWhereInput {
    return {
      NOT: this.buildHasStockWhere(storeId),
    };
  }

  private normalizePositiveInt(
    value: string | number | undefined,
    fallback: number,
    min: number,
    max: number,
  ) {
    const parsed = Number(value ?? fallback);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.max(min, Math.min(max, Math.trunc(parsed)));
  }

  async update(productId: number, data: UpdateProductDto, storeId: number) {
    const payload: {
      title?: string;
      description?: string | null;
      published?: boolean;
      slug?: string;
      weightGrams?: number | null;
      packageHeightCm?: number | null;
      packageWidthCm?: number | null;
      packageLengthCm?: number | null;
      packagingTemplateId?: string | null;
    } = {};

    if (data.title !== undefined) {
      const title = normalizeDisplayText(data.title);
      if (!title) {
        throw new BadRequestException('Product title is required');
      }

      const slug = generateSlug(title);
      await this.ensureSlugAvailable(slug, storeId, productId);
      payload.title = title;
      payload.slug = slug;
    }

    if (data.description !== undefined) {
      payload.description = data.description ?? null;
    }

    if (data.published !== undefined) {
      payload.published = data.published;
    }

    if (data.weightGrams !== undefined) {
      payload.weightGrams = data.weightGrams ?? null;
    }

    if (data.packageHeightCm !== undefined) {
      payload.packageHeightCm = data.packageHeightCm ?? null;
    }

    if (data.packageWidthCm !== undefined) {
      payload.packageWidthCm = data.packageWidthCm ?? null;
    }

    if (data.packageLengthCm !== undefined) {
      payload.packageLengthCm = data.packageLengthCm ?? null;
    }

    if (data.packagingTemplateId !== undefined) {
      payload.packagingTemplateId = data.packagingTemplateId?.trim() || null;
    }

    return this.prisma.product.updateMany({
      where: {
        id: productId,
        storeId,
        deletedAt: null,
      },
      data: payload,
    }).then(async (result) => {
      if (result.count === 0) {
        throw new Error('Product not found');
      }

      return this.prisma.product.findFirst({
        where: {
          id: productId,
          storeId,
          deletedAt: null,
        },
        include: {
          variants: {
            where: {
              deletedAt: null,
            },
            include: {
              inventories: true,
            },
          },
          images: true,
          categories: {
            where: {
              category: {
                deletedAt: null,
              },
            },
            include: {
              category: true,
            },
          },
        },
      });
    });
  }

  async saveComplete(
    productId: number | undefined,
    data: SaveProductCompleteDto,
    storeId: number,
  ) {
    const normalizedTitle = normalizeDisplayText(data.title);

    if (!normalizedTitle) {
      throw new BadRequestException('Product title is required');
    }

    const normalizedCategoryIds = [...new Set((data.categoryIds ?? []).map(Number))];
    const normalizedOptionValues = this.normalizeOptionValues(data.optionValues ?? []);
    const priceInputSettings = await this.resolvePriceInputSettings(storeId);
    const normalizedVariants = this.normalizeVariants(
      data.variants ?? [],
      priceInputSettings,
    );

    this.ensureNoDuplicateVariantSkus(normalizedVariants);

    return this.prisma.$transaction(async (tx) => {
      const product = productId
        ? await this.updateProductRecord(tx, productId, storeId, {
            title: normalizedTitle,
            description: data.description,
            published: data.published,
            weightGrams: data.weightGrams,
            packageHeightCm: data.packageHeightCm,
            packageWidthCm: data.packageWidthCm,
            packageLengthCm: data.packageLengthCm,
            packagingTemplateId: data.packagingTemplateId,
          })
        : await this.createProductRecord(tx, storeId, {
            title: normalizedTitle,
            description: data.description,
            published: data.published,
            weightGrams: data.weightGrams,
            packageHeightCm: data.packageHeightCm,
            packageWidthCm: data.packageWidthCm,
            packageLengthCm: data.packageLengthCm,
            packagingTemplateId: data.packagingTemplateId,
          });

      await this.ensureCategoriesBelongToStore(tx, normalizedCategoryIds, storeId);
      await this.ensureOptionValuesBelongToStore(tx, normalizedOptionValues, storeId);
      await this.syncCategories(tx, product.id, normalizedCategoryIds);
      await this.syncOptionValues(tx, product.id, normalizedOptionValues);
      await this.syncVariants(tx, product.id, storeId, normalizedVariants);

      return this.findById(tx, product.id, storeId);
    });
  }

  async remove(productId: number, storeId: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        storeId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const deletedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.productCategory.deleteMany({
        where: {
          productId,
        },
      }),
      this.prisma.productOptionValue.deleteMany({
        where: {
          productId,
        },
      }),
      this.prisma.product.update({
        where: {
          id: productId,
        },
        data: {
          deletedAt,
        },
      }),
      this.prisma.productVariant.updateMany({
        where: {
          productId,
          deletedAt: null,
        },
        data: {
          deletedAt,
        },
      }),
    ]);

    return { success: true };
  }

  async addCategory(productId: number, categoryId: number, storeId: number) {
    await this.ensureProductAndCategoryBelongToStore(productId, categoryId, storeId);

    return this.prisma.productCategory.upsert({
      where: {
        productId_categoryId: {
          productId,
          categoryId,
        },
      },
      update: {},
      create: {
        productId,
        categoryId,
      },
    });
  }

  async removeCategory(productId: number, categoryId: number, storeId: number) {
    await this.ensureProductAndCategoryBelongToStore(productId, categoryId, storeId);

    return this.prisma.productCategory.delete({
      where: {
        productId_categoryId: {
          productId,
          categoryId,
        },
      },
    });
  }

  async getCategories(productId: number, storeId: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        storeId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.productCategory.findMany({
      where: {
        productId,
        category: {
          deletedAt: null,
        },
      },
      include: {
        category: true,
      },
    });
  }

  private async ensureProductAndCategoryBelongToStore(
    productId: number,
    categoryId: number,
    storeId: number,
  ) {
    const [product, category] = await Promise.all([
      this.prisma.product.findFirst({
        where: {
          id: productId,
          storeId,
          deletedAt: null,
        },
        select: { id: true },
      }),
      this.prisma.category.findFirst({
        where: {
          id: categoryId,
          storeId,
          deletedAt: null,
        },
        select: { id: true },
      }),
    ]);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }

  private async ensureSlugAvailable(
    slug: string,
    storeId: number,
    excludeProductId?: number,
  ) {
    const existing = await this.prisma.product.findFirst({
      where: {
        storeId,
        slug,
        id:
          excludeProductId === undefined
            ? undefined
            : {
                not: excludeProductId,
              },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Ya existe un producto con ese titulo. Editalo o usa otro titulo.',
      );
    }
  }

  private async resolveAvailableSlug(baseSlug: string, storeId: number) {
    const existingProducts = await this.prisma.product.findMany({
      where: {
        storeId,
        OR: [{ slug: baseSlug }, { slug: { startsWith: `${baseSlug}-` } }],
      },
      select: {
        slug: true,
      },
    });

    return this.pickAvailableSlug(baseSlug, existingProducts.map((product) => product.slug));
  }

  private async createProductRecord(
    tx: Prisma.TransactionClient,
    storeId: number,
    data: {
      title: string;
      description?: string | null;
      published?: boolean;
      weightGrams?: number | null;
      packageHeightCm?: number | null;
      packageWidthCm?: number | null;
      packageLengthCm?: number | null;
      packagingTemplateId?: string | null;
    },
  ) {
    const slug = await this.resolveAvailableSlugTx(tx, generateSlug(data.title), storeId);

    return tx.product.create({
      data: {
        title: data.title,
        description: data.description?.trim() ? data.description.trim() : null,
        slug,
        published: data.published ?? false,
        weightGrams: data.weightGrams ?? null,
        packageHeightCm: data.packageHeightCm ?? null,
        packageWidthCm: data.packageWidthCm ?? null,
        packageLengthCm: data.packageLengthCm ?? null,
        packagingTemplateId: data.packagingTemplateId?.trim() || null,
        storeId,
      },
    });
  }

  private async updateProductRecord(
    tx: Prisma.TransactionClient,
    productId: number,
    storeId: number,
    data: {
      title: string;
      description?: string | null;
      published?: boolean;
      weightGrams?: number | null;
      packageHeightCm?: number | null;
      packageWidthCm?: number | null;
      packageLengthCm?: number | null;
      packagingTemplateId?: string | null;
    },
  ) {
    const existing = await tx.product.findFirst({
      where: {
        id: productId,
        storeId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    const slug = generateSlug(data.title);
    await this.ensureSlugAvailableTx(tx, slug, storeId, productId);

    return tx.product.update({
      where: {
        id: productId,
      },
      data: {
        title: data.title,
        description: data.description?.trim() ? data.description.trim() : null,
        slug,
        published: data.published ?? false,
        weightGrams: data.weightGrams ?? null,
        packageHeightCm: data.packageHeightCm ?? null,
        packageWidthCm: data.packageWidthCm ?? null,
        packageLengthCm: data.packageLengthCm ?? null,
        packagingTemplateId: data.packagingTemplateId?.trim() || null,
      },
    });
  }

  private async syncCategories(
    tx: Prisma.TransactionClient,
    productId: number,
    categoryIds: number[],
  ) {
    await tx.productCategory.deleteMany({
      where: {
        productId,
        categoryId: {
          notIn: categoryIds.length > 0 ? categoryIds : [-1],
        },
      },
    });

    if (categoryIds.length === 0) {
      return;
    }

    await tx.productCategory.createMany({
      data: categoryIds.map((categoryId) => ({
        productId,
        categoryId,
      })),
      skipDuplicates: true,
    });
  }

  private async syncOptionValues(
    tx: Prisma.TransactionClient,
    productId: number,
    optionValues: Array<{ productOptionId: number; value: string }>,
  ) {
    await tx.productOptionValue.deleteMany({
      where: {
        productId,
      },
    });

    if (optionValues.length === 0) {
      return;
    }

    await tx.productOptionValue.createMany({
      data: optionValues.map((entry) => ({
        productId,
        productOptionId: entry.productOptionId,
        value: entry.value,
      })),
      skipDuplicates: true,
    });
  }

  private async syncVariants(
    tx: Prisma.TransactionClient,
    productId: number,
    storeId: number,
    variants: Array<{
      id?: number;
      sku: string;
      price: number;
      Size?: string | null;
      Color?: string | null;
      waistSize?: string | null;
      inventoryQuantity: number;
      weightGrams?: number | null;
      width?: number | null;
      length?: number | null;
      packageWidthCm?: number | null;
      packageHeightCm?: number | null;
      packageLengthCm?: number | null;
    }>,
  ) {
    const existingVariants = await tx.productVariant.findMany({
      where: {
        productId,
        deletedAt: null,
      },
      include: {
        inventories: {
          where: {
            storeId,
          },
        },
      },
    });

    const existingIds = new Set(existingVariants.map((variant) => variant.id));
    const requestedIds = new Set(
      variants
        .map((variant) => variant.id)
        .filter((id): id is number => typeof id === 'number'),
    );

    for (const requestedId of requestedIds) {
      if (!existingIds.has(requestedId)) {
        throw new BadRequestException('Variant not found in this product');
      }
    }

    const deletedAt = new Date();
    const variantIdsToDelete = existingVariants
      .map((variant) => variant.id)
      .filter((id) => !requestedIds.has(id));

    if (variantIdsToDelete.length > 0) {
      await tx.productVariant.updateMany({
        where: {
          id: {
            in: variantIdsToDelete,
          },
        },
        data: {
          deletedAt,
        },
      });
    }

    for (const variant of variants) {
      await this.ensureSkuAvailableInStoreTx(tx, variant.sku, storeId, variant.id);

      const payload = this.buildVariantPayload(productId, variant);

      if (variant.id) {
        await tx.productVariant.update({
          where: {
            id: variant.id,
          },
          data: payload,
        });

        await tx.inventory.upsert({
          where: {
            storeId_variantId: {
              storeId,
              variantId: variant.id,
            },
          },
          update: {
            quantity: variant.inventoryQuantity,
          },
          create: {
            storeId,
            variantId: variant.id,
            quantity: variant.inventoryQuantity,
          },
        });

        continue;
      }

      const createdVariant = await tx.productVariant.create({
        data: payload,
      });

      await tx.inventory.create({
        data: {
          storeId,
          variantId: createdVariant.id,
          quantity: variant.inventoryQuantity,
        },
      });
    }
  }

  private buildVariantPayload(
    productId: number,
    variant: {
      sku: string;
      price: number;
      Size?: string | null;
      Color?: string | null;
      waistSize?: string | null;
      weightGrams?: number | null;
      width?: number | null;
      length?: number | null;
      packageWidthCm?: number | null;
      packageHeightCm?: number | null;
      packageLengthCm?: number | null;
    },
  ) {
    const weightGrams = this.normalizePositiveNumber(variant.weightGrams);
    const width = this.normalizePositiveNumber(variant.width);
    const length = this.normalizePositiveNumber(variant.length);
    const packageWidthCm = this.normalizePositiveNumber(variant.packageWidthCm);
    const packageHeightCm = this.normalizePositiveNumber(variant.packageHeightCm);
    const packageLengthCm = this.normalizePositiveNumber(variant.packageLengthCm);

    return {
      productId,
      sku: variant.sku,
      price: variant.price,
      Size: variant.Size?.trim() ? variant.Size.trim() : null,
      Color: variant.Color?.trim() ? variant.Color.trim() : null,
      waistSize: variant.waistSize?.trim() ? variant.waistSize.trim() : null,
      weightGrams,
      weight: weightGrams !== null ? Number((weightGrams / 1000).toFixed(3)) : null,
      width,
      length,
      packageWidthCm,
      packageHeightCm,
      packageLengthCm,
      height: null,
      deletedAt: null,
    };
  }

  private normalizeOptionValues(
    optionValues: Array<{ productOptionId: number; value: string }>,
  ) {
    const seen = new Set<string>();
    const normalized: Array<{ productOptionId: number; value: string }> = [];

    for (const entry of optionValues) {
      const value = normalizeDisplayText(entry.value);
      if (!value) {
        continue;
      }

      const key = `${entry.productOptionId}:${value.toLowerCase()}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      normalized.push({
        productOptionId: Number(entry.productOptionId),
        value,
      });
    }

    return normalized;
  }

  private normalizeVariants(
    variants: Array<{
      id?: number;
      sku: string;
      price: number;
      Size?: string | null;
      Color?: string | null;
      waistSize?: string | null;
      inventoryQuantity?: number;
      weightGrams?: number | null;
      width?: number | null;
      length?: number | null;
      packageWidthCm?: number | null;
      packageHeightCm?: number | null;
      packageLengthCm?: number | null;
    }>,
    priceInputSettings: CashPriceInputSettings,
  ) {
    return variants.map((variant) => {
      const sku = variant.sku.trim();

      if (!sku) {
        throw new BadRequestException('Each variant requires a SKU');
      }

      const price = Number(variant.price);
      if (!Number.isFinite(price)) {
        throw new BadRequestException('Each variant requires a valid price');
      }

      const inventoryQuantity = Number(variant.inventoryQuantity ?? 0);
      if (!Number.isFinite(inventoryQuantity) || inventoryQuantity < 0) {
        throw new BadRequestException('Inventory quantity must be zero or greater');
      }

      return {
        id: variant.id,
        sku,
        price: convertCashInputToBasePrice(price, priceInputSettings),
        Size: normalizeNullableDisplayText(variant.Size),
        Color: normalizeNullableDisplayText(variant.Color),
        waistSize: normalizeNullableDisplayText(variant.waistSize),
        inventoryQuantity: Math.trunc(inventoryQuantity),
        weightGrams: variant.weightGrams,
        width: variant.width,
        length: variant.length,
        packageWidthCm: variant.packageWidthCm,
        packageHeightCm: variant.packageHeightCm,
        packageLengthCm: variant.packageLengthCm,
      };
    });
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

  private ensureNoDuplicateVariantSkus(
    variants: Array<{
      sku: string;
    }>,
  ) {
    const seen = new Set<string>();

    for (const variant of variants) {
      const normalizedSku = variant.sku.trim().toLowerCase();
      if (seen.has(normalizedSku)) {
        throw new BadRequestException('Duplicate SKUs are not allowed in the same save');
      }
      seen.add(normalizedSku);
    }
  }

  private normalizePositiveNumber(value?: number | null) {
    const parsed = Number(value ?? 0);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }

  private async ensureCategoriesBelongToStore(
    tx: Prisma.TransactionClient,
    categoryIds: number[],
    storeId: number,
  ) {
    if (categoryIds.length === 0) {
      return;
    }

    const categories = await tx.category.findMany({
      where: {
        id: {
          in: categoryIds,
        },
        storeId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (categories.length !== categoryIds.length) {
      throw new BadRequestException('One or more categories do not belong to this store');
    }
  }

  private async ensureOptionValuesBelongToStore(
    tx: Prisma.TransactionClient,
    optionValues: Array<{ productOptionId: number; value: string }>,
    storeId: number,
  ) {
    if (optionValues.length === 0) {
      return;
    }

    const optionIds = [...new Set(optionValues.map((entry) => entry.productOptionId))];
    const options = await tx.productOption.findMany({
      where: {
        id: {
          in: optionIds,
        },
        storeId,
      },
      select: {
        id: true,
      },
    });

    if (options.length !== optionIds.length) {
      throw new BadRequestException('One or more product options do not belong to this store');
    }
  }

  private async ensureSlugAvailableTx(
    tx: Prisma.TransactionClient,
    slug: string,
    storeId: number,
    excludeProductId?: number,
  ) {
    const existing = await tx.product.findFirst({
      where: {
        storeId,
        slug,
        id:
          excludeProductId === undefined
            ? undefined
            : {
                not: excludeProductId,
              },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Ya existe un producto con ese titulo. Editalo o usa otro titulo.',
      );
    }
  }

  private async resolveAvailableSlugTx(
    tx: Prisma.TransactionClient,
    baseSlug: string,
    storeId: number,
  ) {
    const existingProducts = await tx.product.findMany({
      where: {
        storeId,
        OR: [{ slug: baseSlug }, { slug: { startsWith: `${baseSlug}-` } }],
      },
      select: {
        slug: true,
      },
    });

    return this.pickAvailableSlug(baseSlug, existingProducts.map((product) => product.slug));
  }

  private pickAvailableSlug(baseSlug: string, existingSlugs: string[]) {
    const usedSlugs = new Set(existingSlugs);

    if (!usedSlugs.has(baseSlug)) {
      return baseSlug;
    }

    for (let suffix = 2; suffix < 10000; suffix += 1) {
      const candidate = `${baseSlug}-${suffix}`;
      if (!usedSlugs.has(candidate)) {
        return candidate;
      }
    }

    throw new BadRequestException('No pudimos generar un slug disponible para este producto.');
  }

  private async ensureSkuAvailableInStoreTx(
    tx: Prisma.TransactionClient,
    sku: string,
    storeId: number,
    excludeVariantId?: number,
  ) {
    const existing = await tx.productVariant.findFirst({
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

  private async findById(
    tx: Prisma.TransactionClient,
    productId: number,
    storeId: number,
  ): Promise<Product | null> {
    return tx.product.findFirst({
      where: {
        id: productId,
        storeId,
        deletedAt: null,
      },
      include: {
        variants: {
          where: {
            deletedAt: null,
          },
          include: {
            inventories: true,
          },
        },
        images: true,
        categories: {
          where: {
            category: {
              deletedAt: null,
            },
          },
          include: {
            category: true,
          },
        },
      },
    });
  }
}
