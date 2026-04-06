import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { GetStoreProductsDto } from './dto/get-store-products.dto';
import { Prisma } from '@prisma/client';
import { ProductPricingService } from '../discounts/product-pricing.service';
import { MercadoPagoProvider } from '../payments/providers/mercadopago.provider';

type NormalizedStorefrontConfig = {
  theme?: string;
  themePalette?: Partial<
    Record<
      | 'background'
      | 'backgroundSoft'
      | 'backgroundElevated'
      | 'paper'
      | 'paperMuted'
      | 'text'
      | 'textMuted'
      | 'textStrong'
      | 'border'
      | 'borderStrong'
      | 'accent'
      | 'accentStrong'
      | 'accentContrast'
      | 'pageShellBg'
      | 'storeShellBg'
      | 'pagePanelBg'
      | 'pagePanelStrongBg'
      | 'mutedFieldBg'
      | 'blockCardBg'
      | 'blockPanelBg'
      | 'testimonialCardBg'
      | 'testimonialCardFeaturedBg'
      | 'newsletterShellBg'
      | 'accountShellBg'
      | 'accountSidebarBg'
      | 'accountGroupBg'
      | 'accountItemBg'
      | 'accountItemBgActive'
      | 'accountItemBorder'
      | 'accountItemBorderActive',
      string
    >
  >;
  themeLayout?: {
    header?: {
      brandLabel?: string;
      primaryLinks?: Array<{
        label: string;
        href: string;
      }>;
    };
    footer?: {
      brandTitle?: string;
      brandSubtitle?: string;
      columns?: Array<{
        title: string;
        links: Array<{
          label: string;
          href: string;
        }>;
      }>;
    };
  };
  pages: {
    home: Array<{
      type: string;
      props?: Record<string, unknown>;
    }>;
  };
};

@Injectable()
export class StorefrontService {
  private readonly themePaletteKeys = [
    'background',
    'backgroundSoft',
    'backgroundElevated',
    'paper',
    'paperMuted',
    'text',
    'textMuted',
    'textStrong',
    'border',
    'borderStrong',
    'accent',
    'accentStrong',
    'accentContrast',
    'pageShellBg',
    'storeShellBg',
    'pagePanelBg',
    'pagePanelStrongBg',
    'mutedFieldBg',
    'blockCardBg',
    'blockPanelBg',
    'testimonialCardBg',
    'testimonialCardFeaturedBg',
    'newsletterShellBg',
    'accountShellBg',
    'accountSidebarBg',
    'accountGroupBg',
    'accountItemBg',
    'accountItemBgActive',
    'accountItemBorder',
    'accountItemBorderActive',
  ] as const;

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private productPricingService: ProductPricingService,
    private mercadoPagoProvider: MercadoPagoProvider,
  ) {}
  async getStoreConfig(storeId?: number, domain?: string) {
    const normalizedDomain = this.normalizeStoreDomain(domain);
    const store = storeId
      ? await this.prisma.store.findUnique({
          where: { id: storeId },
          select: {
            id: true,
            storefrontConfig: true,
            bankTransferDiscountPercentage: true,
          },
        } as any)
      : await this.prisma.store.findUnique({
          where: { domain: normalizedDomain },
          select: {
            id: true,
            storefrontConfig: true,
            bankTransferDiscountPercentage: true,
          },
        } as any);

    if (!store) {
      if (storeId) {
        throw new NotFoundException(`Store with id ${storeId} was not found`);
      }

      throw new NotFoundException(
        `Store is not configured for domain "${normalizedDomain || '(missing)'}"`,
      );
    }

    const storefrontConfig = this.normalizeStorefrontConfig(
      (store as any).storefrontConfig,
    );

    return {
      storeId: store.id,
      theme: storefrontConfig.theme ?? null,
      storefrontConfig,
      paymentProviders: {
        mercadopago: await this.mercadoPagoProvider.getPublicConfig(store.id),
        bankTransfer: {
          enabled: true,
          discountPercentage: Number(
            (store as any).bankTransferDiscountPercentage ?? 0,
          ),
        },
      },
    };
  }

  async getPaymentConfig(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        bankTransferDiscountPercentage: true,
      },
    });

    return {
      mercadopago: await this.mercadoPagoProvider.getPublicConfig(storeId),
      bankTransfer: {
        enabled: true,
        discountPercentage: Number(store?.bankTransferDiscountPercentage ?? 0),
      },
    };
  }

  async getAdminStorefrontConfig(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        storefrontConfig: true,
      },
    } as any);

    return {
      storefrontConfig: this.normalizeStorefrontConfig(
        (store as any)?.storefrontConfig,
      ),
    };
  }

  async updateAdminStorefrontConfig(storeId: number, input: unknown) {
    const storefrontConfig = this.normalizeStorefrontConfig(input);

    await this.prisma.store.update({
      where: { id: storeId },
      data: {
        storefrontConfig: storefrontConfig as Prisma.InputJsonValue,
      },
    } as any);

    return {
      storefrontConfig,
    };
  }

  async getAdminIntegrationsConfig(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        bankTransferDiscountPercentage: true,
      },
    });

    return {
      mercadopago: await this.mercadoPagoProvider.getAdminConfig(storeId),
      bankTransfer: {
        discountPercentage: Number(store?.bankTransferDiscountPercentage ?? 0),
      },
    };
  }

  async updateAdminMercadoPagoConfig(
    storeId: number,
    input: {
      publicKey?: string | null;
      accessToken?: string | null;
      webhookSecret?: string | null;
    },
  ) {
    return {
      mercadopago: await this.mercadoPagoProvider.updateAdminConfig(storeId, input),
    };
  }

  async testAdminMercadoPagoConfig(storeId: number) {
    return this.mercadoPagoProvider.testConfiguration(storeId);
  }

  async updateAdminBankTransferConfig(
    storeId: number,
    input: {
      discountPercentage?: number | null;
    },
  ) {
    const discountPercentage = Math.max(
      0,
      Math.min(Number(input.discountPercentage ?? 0) || 0, 100),
    );

    await this.prisma.store.update({
      where: { id: storeId },
      data: {
        bankTransferDiscountPercentage: Number(
          discountPercentage.toFixed(2),
        ),
      },
    });

    return {
      bankTransfer: {
        discountPercentage: Number(discountPercentage.toFixed(2)),
      },
    };
  }

  private normalizeStoreDomain(domain?: string) {
    const normalized = domain?.trim().toLowerCase() ?? '';

    if (
      normalized.startsWith('localhost:') ||
      normalized.startsWith('127.0.0.1:')
    ) {
      return normalized;
    }

    return normalized.split(':')[0];
  }

  async getProducts(storeId: number, query?: GetStoreProductsDto) {
    const where = await this.buildProductsWhere(storeId, query);
    const products = await this.prisma.product.findMany({
      where,
      include: this.productInclude(storeId),
    });

    return this.productPricingService.attachPricingToProducts(storeId, products);
  }

  getStoreProductOptions(storeId: number) {
    return this.prisma.productOption.findMany({
      where: {
        storeId,
      },
      include: {
        values: {
          select: {
            id: true,
            productId: true,
            value: true,
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
  }

  async getProduct(slug: string, storeId: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        storeId,
        published: true,
        deletedAt: null,
      },
      include: {
        images: true,
        variants: {
          where: {
            deletedAt: null,
          },
          include: {
            inventories: {
              where: {
                storeId,
              },
            },
          },
        },
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
        optionValues: {
          select: {
            productOptionId: true,
            value: true,
          },
        },
      },
    });

    if (!product) {
      return null;
    }

    const [pricedProduct] = await this.productPricingService.attachPricingToProducts(
      storeId,
      [product],
    );

    return pricedProduct;
  }

  async getProductOptions(slug: string, storeId: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        storeId,
        published: true,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      return null;
    }

    return this.prisma.productOption.findMany({
      where: {
        storeId,
        values: {
          some: {
            productId: product.id,
          },
        },
      },
      include: {
        values: {
          where: {
            productId: product.id,
          },
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
  }

  getCategories(storeId: number) {
    return this.prisma.category.findMany({
      where: {
        storeId,
        deletedAt: null,
      },
    });
  }

  async getProductsByCategory(
    slug: string,
    storeId: number,
    query?: GetStoreProductsDto,
  ) {
    const where = await this.buildProductsWhere(storeId, query, slug);

    const products = await this.prisma.product.findMany({
      where,
      include: this.productInclude(storeId),
    });

    return this.productPricingService.attachPricingToProducts(storeId, products);
  }

  createOrder(dto: CreateOrderDto, storeId: number) {
    return this.ordersService.create(dto, storeId);
  }

  private productInclude(storeId: number) {
    return {
      images: true,
      variants: {
        where: {
          deletedAt: null,
        },
        include: {
          inventories: {
            where: {
              storeId,
            },
          },
        },
      },
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
      optionValues: {
        select: {
          productOptionId: true,
          value: true,
        },
      },
    } satisfies Prisma.ProductInclude;
  }

  private async buildProductsWhere(
    storeId: number,
    query?: GetStoreProductsDto,
    categorySlug?: string,
  ): Promise<Prisma.ProductWhereInput> {
    const where: Prisma.ProductWhereInput = {
      storeId,
      published: true,
      deletedAt: null,
    };

    if (categorySlug) {
      where.categories = {
        some: {
          category: {
            slug: categorySlug,
            storeId,
            deletedAt: null,
          },
        },
      };
    }

    const productIds = this.parseIds(query?.productIds);

    if (productIds.length > 0) {
      where.id = {
        in: productIds,
      };
    }

    const optionValueIds = this.parseOptionValueIds(query?.optionValueIds);

    if (optionValueIds.length === 0) {
      return where;
    }

    const optionValues = await this.prisma.productOptionValue.findMany({
      where: {
        id: { in: optionValueIds },
        productOption: {
          storeId,
        },
      },
      select: {
        id: true,
        productOptionId: true,
      },
    });

    if (optionValues.length !== optionValueIds.length) {
      throw new BadRequestException('Invalid option value filters');
    }

    const optionGroups = new Map<number, number[]>();

    for (const value of optionValues) {
      const current = optionGroups.get(value.productOptionId) ?? [];
      current.push(value.id);
      optionGroups.set(value.productOptionId, current);
    }

    const existingAnd = Array.isArray(where.AND)
      ? where.AND
      : where.AND
        ? [where.AND]
        : [];

    where.AND = [
      ...existingAnd,
      ...[...optionGroups.entries()].map(([productOptionId, ids]) => ({
        optionValues: {
          some: {
            productOptionId,
            id: {
              in: ids,
            },
          },
        },
      })),
    ];

    return where;
  }

  private parseOptionValueIds(optionValueIds?: string) {
    return this.parseIds(optionValueIds);
  }

  private parseIds(raw?: string) {
    if (!raw) {
      return [];
    }

    return [...new Set(raw
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0))];
  }

  private normalizeStorefrontConfig(input: unknown): NormalizedStorefrontConfig {
    const source =
      input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
    const theme =
      typeof source.theme === 'string' && source.theme.trim()
        ? source.theme.trim()
        : undefined;
    const rawThemePalette =
      source.themePalette && typeof source.themePalette === 'object'
        ? (source.themePalette as Record<string, unknown>)
        : {};
    const themePalette = this.themePaletteKeys.reduce<
      Partial<Record<(typeof this.themePaletteKeys)[number], string>>
    >((acc, key) => {
      const value = rawThemePalette[key];
      if (typeof value === 'string' && value.trim()) {
        acc[key] = value.trim();
      }
      return acc;
    }, {});
    const rawPages =
      source.pages && typeof source.pages === 'object'
        ? (source.pages as Record<string, unknown>)
        : {};
    const rawHome = Array.isArray(rawPages.home) ? rawPages.home : [];
    const rawThemeLayout =
      source.themeLayout && typeof source.themeLayout === 'object'
        ? (source.themeLayout as Record<string, unknown>)
        : {};
    const rawHeader =
      rawThemeLayout.header && typeof rawThemeLayout.header === 'object'
        ? (rawThemeLayout.header as Record<string, unknown>)
        : {};
    const rawFooter =
      rawThemeLayout.footer && typeof rawThemeLayout.footer === 'object'
        ? (rawThemeLayout.footer as Record<string, unknown>)
        : {};
    const rawHeaderLinks = Array.isArray(rawHeader.primaryLinks)
      ? rawHeader.primaryLinks
      : [];
    const rawFooterColumns = Array.isArray(rawFooter.columns)
      ? rawFooter.columns
      : [];
    const header = {
      ...(typeof rawHeader.brandLabel === 'string' && rawHeader.brandLabel.trim()
        ? { brandLabel: rawHeader.brandLabel.trim() }
        : {}),
      primaryLinks: rawHeaderLinks
        .filter(
          (link): link is Record<string, unknown> =>
            !!link && typeof link === 'object',
        )
        .map((link) => ({
          label:
            typeof link.label === 'string' && link.label.trim()
              ? link.label.trim()
              : '',
          href:
            typeof link.href === 'string' && link.href.trim()
              ? link.href.trim()
              : '',
        }))
        .filter((link) => link.label && link.href),
    };
    const footer = {
      ...(typeof rawFooter.brandTitle === 'string' && rawFooter.brandTitle.trim()
        ? { brandTitle: rawFooter.brandTitle.trim() }
        : {}),
      ...(typeof rawFooter.brandSubtitle === 'string' &&
      rawFooter.brandSubtitle.trim()
        ? { brandSubtitle: rawFooter.brandSubtitle.trim() }
        : {}),
      columns: rawFooterColumns
        .filter(
          (column): column is Record<string, unknown> =>
            !!column && typeof column === 'object',
        )
        .map((column) => ({
          title:
            typeof column.title === 'string' && column.title.trim()
              ? column.title.trim()
              : '',
          links: Array.isArray(column.links)
            ? column.links
                .filter(
                  (link): link is Record<string, unknown> =>
                    !!link && typeof link === 'object',
                )
                .map((link) => ({
                  label:
                    typeof link.label === 'string' && link.label.trim()
                      ? link.label.trim()
                      : '',
                  href:
                    typeof link.href === 'string' && link.href.trim()
                      ? link.href.trim()
                      : '',
                }))
                .filter((link) => link.label && link.href)
            : [],
        }))
        .filter((column) => column.title || column.links.length > 0),
    };

    return {
      ...(theme ? { theme } : {}),
      ...(Object.keys(themePalette).length > 0 ? { themePalette } : {}),
      ...(header.brandLabel || header.primaryLinks.length > 0 || footer.brandTitle || footer.brandSubtitle || footer.columns.length > 0
        ? {
            themeLayout: {
              ...(header.brandLabel || header.primaryLinks.length > 0
                ? { header }
                : {}),
              ...(footer.brandTitle || footer.brandSubtitle || footer.columns.length > 0
                ? { footer }
                : {}),
            },
          }
        : {}),
      pages: {
        home: rawHome
          .filter(
            (block): block is Record<string, unknown> =>
              !!block && typeof block === 'object',
          )
          .map((block) => ({
            type:
              typeof block.type === 'string' && block.type.trim()
                ? block.type.trim()
                : 'banner',
            props:
              block.props && typeof block.props === 'object'
                ? (block.props as Record<string, unknown>)
                : {},
          })),
      },
    };
  }
}
