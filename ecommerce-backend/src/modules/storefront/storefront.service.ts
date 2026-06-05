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
import { StoreShippingProviderConfigService } from '../shipping/services/store-shipping-provider-config.service';

type NormalizedStorefrontConfig = {
  theme?: string;
  defaultLabel?: {
    template: string;
    options: {
      showPrice: boolean;
      priceMode: 'normal' | 'transfer' | 'both' | 'none';
      showStoreName: boolean;
      showProductName: boolean;
      showVariantName: boolean;
      showSku: boolean;
      showLogo: boolean;
    };
  };
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
    private storeShippingProviderConfigService: StoreShippingProviderConfigService,
  ) {}
  async getStoreConfig(storeId?: number, domain?: string) {
    const normalizedDomain = this.normalizeStoreDomain(domain);
    const store = storeId
      ? await this.prisma.store.findUnique({
          where: { id: storeId },
          select: {
            id: true,
            storefrontConfig: true,
            bankTransferAlias: true,
            bankTransferDiscountPercentage: true,
          },
        } as any)
      : await this.prisma.store.findUnique({
          where: { domain: normalizedDomain },
          select: {
            id: true,
            storefrontConfig: true,
            bankTransferAlias: true,
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
          alias: (store as any).bankTransferAlias ?? null,
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
        bankTransferAlias: true,
        bankTransferDiscountPercentage: true,
      },
    });

    return {
      mercadopago: await this.mercadoPagoProvider.getPublicConfig(storeId),
      bankTransfer: {
        enabled: true,
        alias: store?.bankTransferAlias ?? null,
        discountPercentage: Number(store?.bankTransferDiscountPercentage ?? 0),
      },
      cash: {
        enabled: true,
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
        bankTransferAlias: true,
        bankTransferDiscountPercentage: true,
      },
    });

    return {
      mercadopago: await this.mercadoPagoProvider.getAdminConfig(storeId),
      bankTransfer: {
        alias: store?.bankTransferAlias ?? null,
        discountPercentage: Number(store?.bankTransferDiscountPercentage ?? 0),
      },
      correoArgentino: await this.getAdminCorreoArgentinoConfig(storeId),
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
      alias?: string | null;
      discountPercentage?: number | null;
    },
  ) {
    const discountPercentage =
      input.discountPercentage !== undefined
        ? Math.max(0, Math.min(Number(input.discountPercentage ?? 0) || 0, 100))
        : undefined;

    const updatedStore = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        ...(input.alias !== undefined
          ? { bankTransferAlias: this.normalizeBankTransferAlias(input.alias) }
          : {}),
        ...(discountPercentage !== undefined
          ? {
              bankTransferDiscountPercentage: Number(
                discountPercentage.toFixed(2),
              ),
            }
          : {}),
      },
      select: {
        bankTransferAlias: true,
        bankTransferDiscountPercentage: true,
      },
    });

    return {
      bankTransfer: {
        alias: updatedStore.bankTransferAlias ?? null,
        discountPercentage: Number(
          updatedStore.bankTransferDiscountPercentage ?? 0,
        ),
      },
    };
  }

  async updateAdminCorreoArgentinoConfig(
    storeId: number,
    input: {
      enabled?: boolean | null;
      isDefault?: boolean | null;
      senderName?: string | null;
      senderPhone?: string | null;
      senderEmail?: string | null;
      companyName?: string | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    const current = await this.prisma.storeShippingProviderConfig.findFirst({
      where: {
        storeId,
        provider: 'correo-argentino',
      },
      select: {
        metadata: true,
      },
    });
    const currentMetadata =
      current?.metadata && typeof current.metadata === 'object'
        ? (current.metadata as Record<string, unknown>)
        : {};
    const nextMetadata =
      input.metadata && typeof input.metadata === 'object'
        ? {
            ...currentMetadata,
            ...input.metadata,
          }
        : currentMetadata;

    await this.storeShippingProviderConfigService.createOrUpdate(storeId, {
      provider: 'correo-argentino',
      enabled: input.enabled ?? true,
      isDefault: input.isDefault ?? true,
      senderName: input.senderName ?? null,
      senderPhone: input.senderPhone ?? null,
      senderEmail: input.senderEmail ?? null,
      companyName: input.companyName ?? null,
      metadata: nextMetadata as Prisma.InputJsonValue,
    });

    return {
      correoArgentino: await this.getAdminCorreoArgentinoConfig(storeId),
    };
  }

  async testAdminCorreoArgentinoConfig(storeId: number) {
    const config =
      await this.storeShippingProviderConfigService.resolveProviderForCapability(
        storeId,
        'quote',
        {
          providerCode: 'correo-argentino',
        },
      );

    if (!config.provider.testConnection) {
      return {
        ok: false,
        message:
          'Correo Argentino no expone un test de conexion en el provider actual.',
      };
    }

    const runtime = this.getCorreoArgentinoGlobalRuntimeConfig();
    const connection = await config.provider.testConnection(config.context);
    const currentConfig = await this.getAdminCorreoArgentinoConfig(storeId);

    return {
      ...connection,
      checks: {
        apiUsernameConfigured: runtime.apiUsernameConfigured,
        apiPasswordConfigured: runtime.apiPasswordConfigured,
        customerIdConfigured: runtime.customerIdConfigured,
        customerEmailConfigured: runtime.customerEmailConfigured,
        customerPasswordConfigured: runtime.customerPasswordConfigured,
        enabled: currentConfig.enabled,
        originPostalCodeConfigured: Boolean(
          currentConfig.originAddress.postalCode,
        ),
        senderConfigured: Boolean(
          currentConfig.senderName || currentConfig.companyName,
        ),
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

  private async getAdminCorreoArgentinoConfig(storeId: number) {
    const config = await this.prisma.storeShippingProviderConfig.findFirst({
      where: {
        storeId,
        provider: 'correo-argentino',
      },
      select: {
        id: true,
        enabled: true,
        isDefault: true,
        senderName: true,
        senderPhone: true,
        senderEmail: true,
        companyName: true,
        metadata: true,
      },
    });

    const metadata =
      config?.metadata && typeof config.metadata === 'object'
        ? (config.metadata as Record<string, unknown>)
        : {};
    const originAddress =
      metadata.originAddress && typeof metadata.originAddress === 'object'
        ? (metadata.originAddress as Record<string, unknown>)
        : {};
    const defaultPackageDimensions =
      metadata.defaultPackageDimensions &&
      typeof metadata.defaultPackageDimensions === 'object'
        ? (metadata.defaultPackageDimensions as Record<string, unknown>)
        : {};
    const pricing =
      metadata.pricing && typeof metadata.pricing === 'object'
        ? (metadata.pricing as Record<string, unknown>)
        : {};
    const rules =
      metadata.rules && typeof metadata.rules === 'object'
        ? (metadata.rules as Record<string, unknown>)
        : {};
    const flags =
      metadata.flags && typeof metadata.flags === 'object'
        ? (metadata.flags as Record<string, unknown>)
        : {};
    const runtime = this.getCorreoArgentinoGlobalRuntimeConfig();

    return {
      id: config?.id ?? null,
      enabled: config?.enabled ?? false,
      isDefault: config?.isDefault ?? false,
      senderName: config?.senderName ?? '',
      senderPhone: config?.senderPhone ?? '',
      senderEmail: config?.senderEmail ?? '',
      companyName: config?.companyName ?? '',
      originAddress: {
        streetName: this.pickString(originAddress.streetName),
        streetNumber: this.pickString(originAddress.streetNumber),
        floor: this.pickString(originAddress.floor),
        apartment: this.pickString(originAddress.apartment),
        city: this.pickString(originAddress.city),
        state: this.pickString(originAddress.state),
        provinceCode: this.pickString(originAddress.provinceCode),
        postalCode: this.pickString(originAddress.postalCode),
      },
      defaultAgency: this.pickString(metadata.defaultAgency),
      deliveryTypes: Array.isArray(metadata.deliveryTypes)
        ? metadata.deliveryTypes
            .map((value) =>
              typeof value === 'string' ? value.trim().toUpperCase() : '',
            )
            .filter(Boolean)
        : [],
      defaultPackageDimensions: {
        height: this.pickNumber(defaultPackageDimensions.height),
        width: this.pickNumber(defaultPackageDimensions.width),
        length: this.pickNumber(defaultPackageDimensions.length),
      },
      packagingMarginPercent: this.pickNumber(metadata.packagingMarginPercent),
      pricing: {
        markupType: this.pickString(pricing.markupType) || 'percentage',
        markupValue: this.pickNumber(pricing.markupValue),
      },
      rules: {
        allowHomeDelivery: this.pickBoolean(rules.allowHomeDelivery, true),
        allowBranchDelivery: this.pickBoolean(rules.allowBranchDelivery, false),
        requireBranchSelection: this.pickBoolean(
          rules.requireBranchSelection,
          false,
        ),
      },
      flags: {
        autoTrackingEnabled: this.pickBoolean(flags.autoTrackingEnabled, true),
      },
      global: runtime,
    };
  }

  private getCorreoArgentinoGlobalRuntimeConfig() {
    const envMetadata = this.parseJsonRecord(
      process.env.CORREO_ARGENTINO_METADATA_JSON,
    );
    const testingEnabled =
      this.pickBoolean(envMetadata.testing, undefined) ??
      this.pickBoolean(process.env.CORREO_ARGENTINO_TESTING, true);
    const mode =
      this.pickString(envMetadata.mode).toUpperCase() ||
      (process.env.CORREO_ARGENTINO_MODE?.trim().toUpperCase() || 'MICORREO');
    const apiBaseUrl =
      this.pickString(envMetadata.apiBaseUrl) ||
      process.env.CORREO_ARGENTINO_API_BASE_URL?.trim() ||
      (testingEnabled
        ? 'https://apitest.correoargentino.com.ar/micorreo/v1'
        : 'https://api.correoargentino.com.ar/micorreo/v1');
    const apiUsername =
      this.pickString(envMetadata.apiUsername) ||
      process.env.CORREO_ARGENTINO_API_USERNAME?.trim() ||
      process.env.CORREO_ARGENTINO_API_KEY?.trim() ||
      '';
    const apiPassword =
      this.pickString(envMetadata.apiPassword) ||
      process.env.CORREO_ARGENTINO_API_PASSWORD?.trim() ||
      process.env.CORREO_ARGENTINO_SECRET_KEY?.trim() ||
      '';
    const customerId =
      this.pickString(envMetadata.customerId) ||
      process.env.CORREO_ARGENTINO_CUSTOMER_ID?.trim() ||
      '';
    const customerEmail =
      this.pickString(envMetadata.customerEmail) ||
      this.pickString(envMetadata.email) ||
      process.env.CORREO_ARGENTINO_EMAIL?.trim() ||
      '';
    const customerPassword =
      this.pickString(envMetadata.customerPassword) ||
      this.pickString(envMetadata.password) ||
      process.env.CORREO_ARGENTINO_PASSWORD?.trim() ||
      '';

    return {
      mode,
      apiBaseUrl,
      apiUsernameConfigured: Boolean(apiUsername),
      apiPasswordConfigured: Boolean(apiPassword),
      customerIdConfigured: Boolean(customerId),
      customerEmailConfigured: Boolean(customerEmail),
      customerPasswordConfigured: Boolean(customerPassword),
    };
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

    const searchFilter = await this.buildProductSearchFilter(storeId, query?.search);
    if (searchFilter) {
      where.AND = this.appendProductWhereAnd(where.AND, searchFilter);
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

    where.AND = this.appendProductWhereAnd(
      where.AND,
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
    );

    return where;
  }

  private async buildProductSearchFilter(
    storeId: number,
    rawSearch?: string,
  ): Promise<Prisma.ProductWhereInput | null> {
    const search = rawSearch?.trim().slice(0, 80);

    if (!search) {
      return null;
    }

    const exactCategory = await this.prisma.category.findFirst({
      where: {
        storeId,
        deletedAt: null,
        OR: [
          {
            slug: {
              equals: search,
              mode: 'insensitive',
            },
          },
          {
            name: {
              equals: search,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (exactCategory) {
      return {
        categories: {
          some: {
            categoryId: exactCategory.id,
          },
        },
      };
    }

    const contains = {
      contains: search,
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
    };
  }

  private appendProductWhereAnd(
    current: Prisma.ProductWhereInput['AND'],
    ...filters: Prisma.ProductWhereInput[]
  ) {
    const existingAnd = Array.isArray(current) ? current : current ? [current] : [];

    return [...existingAnd, ...filters];
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

  private parseJsonRecord(value?: string | null) {
    if (!value?.trim()) {
      return {} as Record<string, unknown>;
    }

    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  private pickString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }

  private pickNumber(value: unknown) {
    const normalized = Number(value ?? 0);
    return Number.isFinite(normalized) ? normalized : 0;
  }

  private pickBoolean(value: unknown, fallback?: boolean) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }

    return fallback ?? false;
  }

  private normalizeBankTransferAlias(value?: string | null) {
    const alias = value?.trim() ?? '';
    return alias ? alias.slice(0, 80) : null;
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
    const defaultLabel = this.normalizeDefaultLabelConfig(source.defaultLabel);
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
      ...(defaultLabel ? { defaultLabel } : {}),
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

  private normalizeDefaultLabelConfig(input: unknown): NormalizedStorefrontConfig['defaultLabel'] | undefined {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return undefined;
    }

    const source = input as Record<string, unknown>;
    const options =
      source.options && typeof source.options === 'object' && !Array.isArray(source.options)
        ? (source.options as Record<string, unknown>)
        : {};
    const priceMode = ['normal', 'transfer', 'both', 'none'].includes(String(options.priceMode))
      ? (options.priceMode as 'normal' | 'transfer' | 'both' | 'none')
      : 'normal';

    if (typeof source.template !== 'string' || !source.template.trim()) {
      return undefined;
    }

    return {
      template: source.template.trim(),
      options: {
        showPrice: priceMode !== 'none' && (typeof options.showPrice === 'boolean' ? options.showPrice : true),
        priceMode,
        showStoreName: typeof options.showStoreName === 'boolean' ? options.showStoreName : true,
        showProductName: typeof options.showProductName === 'boolean' ? options.showProductName : true,
        showVariantName: typeof options.showVariantName === 'boolean' ? options.showVariantName : true,
        showSku: typeof options.showSku === 'boolean' ? options.showSku : true,
        showLogo: typeof options.showLogo === 'boolean' ? options.showLogo : false,
      },
    };
  }
}
