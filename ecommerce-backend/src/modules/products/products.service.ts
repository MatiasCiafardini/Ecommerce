import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CatalogAuditService,
  type CatalogAuditActor,
} from '../catalog-audit/catalog-audit.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SaveProductCompleteDto } from './dto/save-product-complete.dto';
import { generateSlug } from '../../common/utils/slug.util';
import { normalizeDisplayText } from '../../common/utils/display-text.util';
import {
  normalizeBrandDisplayName,
  normalizeBrandKey,
  uniqueBrandDisplayNames,
} from '../../common/utils/brand.util';
import {
  convertCashInputToBasePrice,
  resolveCashPriceInputSettings,
  type CashPriceInputSettings,
} from '../../common/price-input-mode';

const normalizeNullableDisplayText = (value?: string | null) => {
  const normalized = normalizeDisplayText(value);
  return normalized || null;
};

const normalizeNullableBrand = (value?: string | null) => {
  const normalized = normalizeBrandDisplayName(value);
  return normalized || null;
};

type ProductCatalogMetrics = {
  total: number;
  published: number;
  draft: number;
  withoutStock: number;
};

const CATALOG_METRICS_CACHE_MS = 30_000;
const catalogMetricsCache = new Map<
  number,
  { expiresAt: number; metrics: ProductCatalogMetrics }
>();

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private catalogAudit: CatalogAuditService,
  ) {}

  async create(data: CreateProductDto, storeId: number, actor?: CatalogAuditActor) {
    const title = normalizeDisplayText(data.title);
    if (!title) {
      throw new BadRequestException('Product title is required');
    }

    const slug = await this.resolveAvailableSlug(generateSlug(title), storeId);

    const product = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          title,
          brand: normalizeNullableBrand(data.brand),
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

      await this.catalogAudit.create({
        storeId,
        productId: product.id,
        action: 'product.created',
        entity: 'product',
        entityId: product.id,
        actor,
        after: product,
      }, tx);

      return product;
    });

    this.invalidateCatalogMetrics(storeId);
    return product;
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
      imageStatus?: string;
      brand?: string;
      page?: string;
      pageSize?: string;
      includeMetrics?: string;
    },
  ) {
    const page = this.normalizePositiveInt(query.page, 1, 1, 10_000);
    const pageSize = this.normalizePositiveInt(query.pageSize, 80, 20, 120);
    const includeMetrics = query.includeMetrics !== 'false';
    const where = this.buildAdminCatalogWhere(storeId, query);
    const metricsPromise = includeMetrics
      ? this.getCatalogMetrics(storeId)
      : Promise.resolve(null);

    const [items, total, metrics, availableBrandValues] =
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
            optionValues: {
              where: {
                productOption: {
                  storeId,
                  OR: [
                    { name: { equals: 'Marca', mode: 'insensitive' } },
                    { name: { equals: 'Marcas', mode: 'insensitive' } },
                  ],
                },
              },
              orderBy: { value: 'asc' },
              select: {
                value: true,
                productOption: { select: { name: true } },
              },
            },
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
        metricsPromise,
        this.prisma.productOptionValue.findMany({
          where: {
            productOption: {
              storeId,
              OR: [
                { name: { equals: 'Marca', mode: 'insensitive' } },
                { name: { equals: 'Marcas', mode: 'insensitive' } },
              ],
            },
          },
          distinct: ['value'],
          orderBy: { value: 'asc' },
          select: { value: true },
        }),
      ]);
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      availableBrands: uniqueBrandDisplayNames(availableBrandValues.map((entry) => entry.value)),
      ...(metrics
        ? {
            metrics,
          }
        : {}),
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
    const searchTerms = this.parseSearchTerms(rawSearch);

    if (searchTerms.length === 0) {
      return where;
    }

    where.AND = searchTerms.map((term) => {
      const contains = {
        contains: term,
        mode: 'insensitive',
      } satisfies Prisma.StringFilter;

      return {
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
      } satisfies Prisma.ProductWhereInput;
    });

    return where;
  }

  private parseSearchTerms(rawSearch?: string) {
    return (rawSearch ?? '')
      .trim()
      .slice(0, 80)
      .split(/\s+/u)
      .map((term) => term.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  private buildAdminCatalogWhere(
    storeId: number,
    query: {
      search?: string;
      categoryId?: string;
      status?: string;
      imageStatus?: string;
      brand?: string;
    },
  ): Prisma.ProductWhereInput {
    const where = this.buildFindAllWhere(storeId, query.search);
    const categoryId = Number(query.categoryId);
    const status = query.status?.trim();
    const imageStatus = query.imageStatus?.trim();
    const brand = query.brand?.trim();
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
    } else if (status === 'draft') {
      where.published = false;
    } else if (status === 'without-stock') {
      andConditions.push(this.buildWithoutStockWhere(storeId));
    }

    if (imageStatus === 'with-images') {
      where.images = { some: {} };
    } else if (imageStatus === 'without-images') {
      where.images = { none: {} };
    }

    const brandOptionWhere = {
      storeId,
      OR: [
        { name: { equals: 'Marca', mode: 'insensitive' as const } },
        { name: { equals: 'Marcas', mode: 'insensitive' as const } },
      ],
    };

    if (brand === '__without_brand__') {
      andConditions.push({
        optionValues: { none: { productOption: brandOptionWhere } },
      });
    } else if (brand) {
      andConditions.push({
        optionValues: {
          some: {
            value: { equals: brand, mode: 'insensitive' },
            productOption: brandOptionWhere,
          },
        },
      });
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

  async update(
    productId: number,
    data: UpdateProductDto,
    storeId: number,
    actor?: CatalogAuditActor,
  ) {
    const payload: {
      title?: string;
      brand?: string | null;
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

    if (data.brand !== undefined) {
      payload.brand = normalizeNullableBrand(data.brand);
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

    const product = await this.prisma.$transaction(async (tx) => {
      const before = await this.findById(tx, productId, storeId);
      if (!before) {
        throw new NotFoundException('Product not found');
      }

      const result = await tx.product.updateMany({
        where: {
          id: productId,
          storeId,
          deletedAt: null,
        },
        data: payload,
      });

      if (result.count === 0) {
        throw new NotFoundException('Product not found');
      }

      const after = await tx.product.findFirst({
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

      await this.catalogAudit.create({
        storeId,
        productId,
        action: 'product.updated',
        entity: 'product',
        entityId: productId,
        actor,
        before,
        after,
        metadata: { fields: Object.keys(payload) },
      }, tx);

      return after;
    });

    this.invalidateCatalogMetrics(storeId);
    return product;
  }

  async saveComplete(
    productId: number | undefined,
    data: SaveProductCompleteDto,
    storeId: number,
    actor?: CatalogAuditActor,
  ) {
    const normalizedTitle = normalizeDisplayText(data.title);

    if (!normalizedTitle) {
      throw new BadRequestException('Product title is required');
    }

    const normalizedCategoryIds = [...new Set((data.categoryIds ?? []).map(Number))];
    const rawOptionValues = data.optionValues ?? [];
    const optionIds = [...new Set(rawOptionValues.map((entry) => Number(entry.productOptionId)))];
    const [priceInputSettings, optionDefinitions] = await Promise.all([
      this.resolvePriceInputSettings(storeId),
      optionIds.length
        ? this.prisma.productOption.findMany({
            where: { id: { in: optionIds }, storeId },
            select: { id: true, name: true },
          })
        : Promise.resolve<Array<{ id: number; name: string }>>([]),
    ]);
    const brandOptionIds = new Set(
      optionDefinitions
        .filter((option) => ['marca', 'marcas'].includes(normalizeBrandKey(option.name)))
        .map((option) => option.id),
    );
    const normalizedOptionValues = this.normalizeOptionValues(rawOptionValues, brandOptionIds);
    const normalizedVariants = this.normalizeVariants(
      data.variants ?? [],
      priceInputSettings,
    );

    this.ensureNoDuplicateVariantSkus(normalizedVariants);

    const product = await this.prisma.$transaction(async (tx) => {
      const before = productId ? await this.findById(tx, productId, storeId) : null;
      const product = productId
          ? await this.updateProductRecord(tx, productId, storeId, {
            title: normalizedTitle,
            brand: data.brand,
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
            brand: data.brand,
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
      await this.ensureReusableVariantAttributeValues(tx, storeId, normalizedVariants);
      await this.syncCategories(tx, product.id, normalizedCategoryIds);
      await this.syncOptionValues(tx, product.id, normalizedOptionValues);
      await this.syncVariants(tx, product.id, storeId, normalizedVariants);

      const after = await this.findById(tx, product.id, storeId);

      await this.catalogAudit.create({
        storeId,
        productId: product.id,
        action: productId ? 'product.updated' : 'product.created',
        entity: 'product',
        entityId: product.id,
        actor,
        before,
        after,
        metadata: {
          mode: 'save-complete',
          categoryIds: normalizedCategoryIds,
          optionValueCount: normalizedOptionValues.length,
          variantCount: normalizedVariants.length,
        },
      }, tx);

      return after;
    });

    this.invalidateCatalogMetrics(storeId);
    return product;
  }

  async remove(productId: number, storeId: number, actor?: CatalogAuditActor) {
    const product = await this.findById(this.prisma, productId, storeId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const deletedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.productCategory.deleteMany({
        where: {
          productId,
        },
      });
      await tx.productOptionValue.deleteMany({
        where: {
          productId,
        },
      });
      await tx.product.update({
        where: {
          id: productId,
        },
        data: {
          deletedAt,
        },
      });
      await tx.productVariant.updateMany({
        where: {
          productId,
          deletedAt: null,
        },
        data: {
          deletedAt,
        },
      });
      await this.catalogAudit.create({
        storeId,
        productId,
        action: 'product.deleted',
        entity: 'product',
        entityId: productId,
        actor,
        before: product,
        after: { ...product, deletedAt },
      }, tx);
    });

    this.invalidateCatalogMetrics(storeId);
    return { success: true };
  }

  async addCategory(
    productId: number,
    categoryId: number,
    storeId: number,
    actor?: CatalogAuditActor,
  ) {
    await this.ensureProductAndCategoryBelongToStore(productId, categoryId, storeId);

    return this.prisma.$transaction(async (tx) => {
      const before = await this.findById(tx, productId, storeId);
      const result = await tx.productCategory.upsert({
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
      const after = await this.findById(tx, productId, storeId);
      await this.catalogAudit.create({
        storeId,
        productId,
        action: 'product.category_added',
        entity: 'productCategory',
        entityId: categoryId,
        actor,
        before,
        after,
        metadata: { categoryId },
      }, tx);
      return result;
    });
  }

  async removeCategory(
    productId: number,
    categoryId: number,
    storeId: number,
    actor?: CatalogAuditActor,
  ) {
    await this.ensureProductAndCategoryBelongToStore(productId, categoryId, storeId);

    return this.prisma.$transaction(async (tx) => {
      const before = await this.findById(tx, productId, storeId);
      const result = await tx.productCategory.delete({
        where: {
          productId_categoryId: {
            productId,
            categoryId,
          },
        },
      });
      const after = await this.findById(tx, productId, storeId);
      await this.catalogAudit.create({
        storeId,
        productId,
        action: 'product.category_removed',
        entity: 'productCategory',
        entityId: categoryId,
        actor,
        before,
        after,
        metadata: { categoryId },
      }, tx);
      return result;
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

  private async getCatalogMetrics(storeId: number): Promise<ProductCatalogMetrics> {
    const cached = catalogMetricsCache.get(storeId);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.metrics;
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        total: number | bigint;
        published: number | bigint;
        draft: number | bigint;
        withoutStock: number | bigint;
      }>
    >(Prisma.sql`
      WITH product_stock AS (
        SELECT
          p.id,
          p.published,
          COALESCE(SUM(COALESCE(i.quantity, 0)), 0) AS stock
        FROM "Product" p
        LEFT JOIN "ProductVariant" v
          ON v."productId" = p.id
          AND v."deletedAt" IS NULL
        LEFT JOIN "Inventory" i
          ON i."variantId" = v.id
          AND i."storeId" = p."storeId"
        WHERE
          p."storeId" = ${storeId}
          AND p."deletedAt" IS NULL
        GROUP BY p.id, p.published
      )
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE published = true)::int AS published,
        COUNT(*) FILTER (WHERE published = false)::int AS draft,
        COUNT(*) FILTER (WHERE stock <= 0)::int AS "withoutStock"
      FROM product_stock
    `);

    const row = rows[0];
    const metrics = {
      total: Number(row?.total ?? 0),
      published: Number(row?.published ?? 0),
      draft: Number(row?.draft ?? 0),
      withoutStock: Number(row?.withoutStock ?? 0),
    };

    catalogMetricsCache.set(storeId, {
      metrics,
      expiresAt: now + CATALOG_METRICS_CACHE_MS,
    });

    return metrics;
  }

  private invalidateCatalogMetrics(storeId: number) {
    catalogMetricsCache.delete(storeId);
  }

  async getAuditLogs(productId: number, storeId: number, rawLimit?: string | number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        storeId,
      },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const requestedLimit = Number(rawLimit ?? 100);
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(Math.trunc(requestedLimit), 500)
        : 100;

    return this.prisma.catalogAuditLog.findMany({
      where: {
        storeId,
        productId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        actorUser: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
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
      brand?: string | null;
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
        brand: normalizeNullableBrand(data.brand),
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
      brand?: string | null;
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
        brand: normalizeNullableBrand(data.brand),
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

  private async ensureReusableVariantAttributeValues(
    tx: Prisma.TransactionClient,
    storeId: number,
    variants: Array<{
      Size?: string | null;
      Color?: string | null;
      waistSize?: string | null;
    }>,
  ) {
    const specs = [
      { name: 'Color', type: 'color', values: variants.map((variant) => variant.Color) },
      { name: 'Talle', type: 'text', values: variants.map((variant) => variant.Size) },
      { name: 'Talle cintura', type: 'number', values: variants.map((variant) => variant.waistSize) },
    ];

    for (const spec of specs) {
      const values = this.uniqueDisplayValues(spec.values);
      if (values.length === 0) {
        continue;
      }

      const option = await this.findOrCreateProductOptionTx(
        tx,
        storeId,
        spec.name,
        spec.type,
      );

      await this.ensureReusableValuesTx(tx, option.id, values);
    }
  }

  private uniqueDisplayValues(values: Array<string | null | undefined>) {
    const seen = new Set<string>();
    const normalized: string[] = [];

    for (const value of values) {
      const displayValue = normalizeDisplayText(value);
      if (!displayValue) {
        continue;
      }

      const key = displayValue.toLocaleLowerCase('es-AR');
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      normalized.push(displayValue);
    }

    return normalized;
  }

  private async findOrCreateProductOptionTx(
    tx: Prisma.TransactionClient,
    storeId: number,
    name: string,
    attributeType: string,
  ) {
    const existing = await tx.productOption.findFirst({
      where: {
        storeId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        attributeType: true,
      },
    });

    if (existing) {
      if (existing.attributeType !== attributeType) {
        await tx.productOption.update({
          where: { id: existing.id },
          data: { attributeType },
        });
      }

      return existing;
    }

    return tx.productOption.create({
      data: {
        storeId,
        name,
        attributeType,
      },
      select: {
        id: true,
        attributeType: true,
      },
    });
  }

  private async ensureReusableValuesTx(
    tx: Prisma.TransactionClient,
    productOptionId: number,
    values: string[],
  ) {
    const existingValues = await tx.productOptionReusableValue.findMany({
      where: { productOptionId },
      select: { value: true },
    });
    const existingKeys = new Set(
      existingValues.map((entry) => entry.value.trim().toLocaleLowerCase('es-AR')),
    );

    let nextPosition =
      (await tx.productOptionReusableValue.findFirst({
        where: { productOptionId },
        orderBy: { position: 'desc' },
        select: { position: true },
      }))?.position ?? -1;

    for (const value of values) {
      const key = value.trim().toLocaleLowerCase('es-AR');
      if (existingKeys.has(key)) {
        continue;
      }

      nextPosition += 1;
      await tx.productOptionReusableValue.create({
        data: {
          productOptionId,
          value,
          position: nextPosition,
        },
      });
      existingKeys.add(key);
    }
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
    brandOptionIds = new Set<number>(),
  ) {
    const seen = new Set<string>();
    const normalized: Array<{ productOptionId: number; value: string }> = [];

    for (const entry of optionValues) {
      const productOptionId = Number(entry.productOptionId);
      const value = brandOptionIds.has(productOptionId)
        ? normalizeBrandDisplayName(entry.value)
        : normalizeDisplayText(entry.value);
      if (!value) {
        continue;
      }

      const key = `${productOptionId}:${value.toLocaleLowerCase('es-AR')}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      normalized.push({
        productOptionId,
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

  async checkSkus(
    candidates: Array<{ sku: string; excludeVariantId?: number }>,
    storeId: number,
  ) {
    const normalizedCandidates = candidates
      .map((candidate) => ({
        sku: candidate.sku.trim(),
        excludeVariantId: candidate.excludeVariantId,
      }))
      .filter((candidate) => candidate.sku.length > 0);

    if (normalizedCandidates.length === 0) {
      return { unavailableSkus: [] };
    }

    const variants = await this.prisma.productVariant.findMany({
      where: {
        deletedAt: null,
        product: {
          storeId,
        },
        OR: normalizedCandidates.map((candidate) => ({
          sku: {
            equals: candidate.sku,
            mode: 'insensitive',
          },
        })),
      },
      select: {
        id: true,
        sku: true,
      },
    });

    const unavailableSkus = normalizedCandidates
      .filter((candidate) =>
        variants.some(
          (variant) =>
            variant.sku.trim().toLowerCase() === candidate.sku.toLowerCase() &&
            variant.id !== candidate.excludeVariantId,
        ),
      )
      .map((candidate) => candidate.sku);

    return { unavailableSkus };
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
