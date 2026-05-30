import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { runtimeConfig } from '../../config/runtime-config';
import { PrismaService } from '../../prisma/prisma.service';
import { Code128BarcodeService } from './barcode/code128-barcode.service';
import { GenerateLabelsDto, LabelOptionsDto } from './dto/generate-labels.dto';
import { ListLabelProductsDto } from './dto/list-label-products.dto';
import { LabelPdfRenderer, PrintableLabel } from './pdf/label-pdf.renderer';
import { LABEL_TEMPLATES, getLabelTemplate, type LabelPriceMode } from './templates/label-templates';

@Injectable()
export class LabelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly barcode: Code128BarcodeService,
    private readonly pdfRenderer: LabelPdfRenderer,
  ) {}

  async listProducts(storeId: number, query: ListLabelProductsDto) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 25)));
    const where = this.buildVariantWhere(storeId, query);

    const [total, variants] = await Promise.all([
      this.prisma.productVariant.count({ where }),
      this.prisma.productVariant.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              published: true,
              images: { orderBy: { position: 'asc' }, take: 1 },
              categories: {
                where: { category: { deletedAt: null } },
                include: { category: true },
              },
            },
          },
          inventories: { where: { storeId } },
        },
        orderBy: [{ product: { title: 'asc' } }, { sku: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: variants.map((variant) => this.serializeVariant(variant, storeId)),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getTemplates(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { bankTransferDiscountPercentage: true },
    });
    const bankTransferDiscountPercentage = this.normalizeDiscountPercentage(
      store?.bankTransferDiscountPercentage,
    );
    const hasTransferPrice = bankTransferDiscountPercentage > 0;

    return {
      templates: Object.values(LABEL_TEMPLATES),
      priceSettings: {
        hasTransferPrice,
        bankTransferDiscountPercentage,
      },
    };
  }

  async preview(storeId: number, dto: GenerateLabelsDto) {
    const template = getLabelTemplate(dto.template);
    if (!template) throw new BadRequestException('Invalid label template');

    const labels = await this.buildLabels(storeId, dto, 120);

    return {
      template,
      options: this.normalizeOptions(dto.options),
      priceSettings: await this.getPriceSettings(storeId),
      totalLabels: await this.countRequestedLabels(dto),
      labels: labels.map((label, index) => ({
        id: `${label.sku}-${index}`,
        ...label,
        barcodeSvg: this.barcode.toSvg(label.sku),
      })),
    };
  }

  async pdf(storeId: number, dto: GenerateLabelsDto) {
    const template = getLabelTemplate(dto.template);
    if (!template) throw new BadRequestException('Invalid label template');

    const totalLabels = await this.countRequestedLabels(dto);
    const maxPdfLabels = runtimeConfig.labelsMaxPdfLabels;
    if (totalLabels > maxPdfLabels) {
      throw new BadRequestException(
        `El PDF supera el limite de seguridad de ${maxPdfLabels} etiquetas. Reduce cantidades o genera varios PDFs.`,
      );
    }

    const labels = await this.buildLabels(storeId, dto, maxPdfLabels);
    const pdf = await this.pdfRenderer.render(labels, template, this.normalizeOptions(dto.options));

    return {
      filename: `etiquetas-${template.key.toLowerCase()}-${Date.now()}.pdf`,
      pdf,
    };
  }

  private buildVariantWhere(storeId: number, query: ListLabelProductsDto): Prisma.ProductVariantWhereInput {
    const where: Prisma.ProductVariantWhereInput = {
      deletedAt: null,
      product: {
        storeId,
        deletedAt: null,
      },
    };
    const and: Prisma.ProductVariantWhereInput[] = [];
    const search = query.search?.trim().slice(0, 80);
    const sku = query.sku?.trim().slice(0, 80);
    const name = query.name?.trim().slice(0, 80);

    if (query.activeOnly ?? true) {
      and.push({ product: { published: true } });
    }

    if (search) {
      const contains = { contains: search, mode: 'insensitive' } satisfies Prisma.StringFilter;
      and.push({
        OR: [
          { sku: contains },
          { Color: contains },
          { Size: contains },
          { product: { title: contains } },
        ],
      });
    }

    if (sku) {
      and.push({ sku: { contains: sku, mode: 'insensitive' } });
    }

    if (name) {
      and.push({ product: { title: { contains: name, mode: 'insensitive' } } });
    }

    if (query.categoryId) {
      and.push({
        product: {
          categories: {
            some: {
              categoryId: query.categoryId,
              category: { storeId, deletedAt: null },
            },
          },
        },
      });
    }

    if (query.productId) {
      and.push({ productId: query.productId });
    }

    const variantIds = this.parseIdList(query.variantIds);
    if (variantIds.length > 0) {
      and.push({ id: { in: variantIds } });
    }

    if (query.stockOnly) {
      and.push({
        inventories: {
          some: {
            storeId,
            quantity: { gt: 0 },
          },
        },
      });
    }

    if (and.length > 0) {
      where.AND = and;
    }

    return where;
  }

  private async buildLabels(storeId: number, dto: GenerateLabelsDto, maxLabels: number) {
    const normalizedItems = this.normalizeItems(dto.items);
    if (normalizedItems.length === 0) {
      throw new BadRequestException('At least one variant is required');
    }

    const variants = await this.prisma.productVariant.findMany({
      where: {
        id: { in: normalizedItems.map((item) => item.variantId) },
        deletedAt: null,
        product: { storeId, deletedAt: null },
      },
      include: {
        product: { select: { title: true } },
      },
    });

    if (variants.length !== normalizedItems.length) {
      throw new NotFoundException('Some variants do not belong to this store');
    }

    const variantWithoutSku = variants.find((variant) => !variant.sku?.trim());
    if (variantWithoutSku) {
      const variantName = [variantWithoutSku.product.title, variantWithoutSku.Color, variantWithoutSku.Size]
        .filter(Boolean)
        .join(' ');
      throw new BadRequestException(
        `La variante "${variantName}" no tiene SKU. Agrega un SKU antes de generar etiquetas.`,
      );
    }

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { name: true, storefrontConfig: true, bankTransferDiscountPercentage: true },
    });
    const variantById = new Map(variants.map((variant) => [variant.id, variant]));
    const labels: PrintableLabel[] = [];
    const logoUrl = this.resolveStoreLogoUrl(store?.storefrontConfig);
    const storeAddress = this.resolveStoreAddress(storeId, store?.name);
    const bankTransferDiscountPercentage = this.normalizeDiscountPercentage(
      store?.bankTransferDiscountPercentage,
    );

    for (const item of normalizedItems) {
      const variant = variantById.get(item.variantId);
      if (!variant) continue;
      const normalPrice = Number(variant.price);
      const transferPrice = this.resolveTransferPrice(normalPrice, bankTransferDiscountPercentage);

      for (let index = 0; index < item.quantity && labels.length < maxLabels; index += 1) {
        labels.push({
          productName: variant.product.title,
          variantName: [variant.Color, variant.Size].filter(Boolean).join(' ') || variant.sku,
          sku: variant.sku,
          price: this.formatMoney(normalPrice),
          normalPrice: this.formatMoney(normalPrice),
          transferPrice: transferPrice ? this.formatMoney(transferPrice) : null,
          storeName: store?.name ?? '',
          storeAddress,
          logoUrl,
        });
      }
    }

    return labels;
  }

  private resolveStoreLogoUrl(storefrontConfig: Prisma.JsonValue | null | undefined) {
    if (!storefrontConfig || typeof storefrontConfig !== 'object' || Array.isArray(storefrontConfig)) {
      return null;
    }

    const config = storefrontConfig as Record<string, unknown>;
    const branding = config.branding && typeof config.branding === 'object' && !Array.isArray(config.branding)
      ? (config.branding as Record<string, unknown>)
      : null;
    const logoUrl = typeof branding?.logoUrl === 'string' ? branding.logoUrl.trim() : '';

    if (logoUrl) {
      return logoUrl;
    }

    const theme = typeof config.theme === 'string' ? config.theme.trim().toLowerCase() : '';
    const themeLogos: Record<string, string> = {
      trojani: '/images/trojani/logo_trojani_recortado.png',
      mimaria: '/images/mimaria/logo.png',
      milashoes: '/images/milashoes/logo.jpg',
      libreria: '/images/libreria/logo_solja_transparente.png',
      comovosyyo: '/images/comovosyyo/logo.png',
    };

    return themeLogos[theme] ?? null;
  }

  private resolveStoreAddress(storeId: number, storeName: string | null | undefined) {
    const normalizedName = storeName?.trim().toLowerCase() ?? '';

    if (storeId === 1 || storeId === 7 || normalizedName === 'como vos y yo') {
      return 'Alsina 289 y Alsina 222';
    }

    return null;
  }

  private normalizeItems(items: GenerateLabelsDto['items']) {
    const quantities = new Map<number, number>();

    for (const item of items ?? []) {
      if (!Number.isInteger(item.variantId) || item.variantId <= 0) continue;
      if (!Number.isInteger(item.quantity) || item.quantity < 0) {
        throw new BadRequestException('Quantities must be non-negative integers');
      }
      quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
    }

    return [...quantities.entries()]
      .filter(([, quantity]) => quantity > 0)
      .map(([variantId, quantity]) => ({ variantId, quantity }));
  }

  private async countRequestedLabels(dto: GenerateLabelsDto) {
    return this.normalizeItems(dto.items).reduce((total, item) => total + item.quantity, 0);
  }

  private normalizeOptions(options?: LabelOptionsDto): Required<LabelOptionsDto> {
    const priceMode = this.normalizePriceMode(options?.priceMode, options?.showPrice);
    return {
      showPrice: priceMode !== 'none',
      showStoreName: options?.showStoreName ?? true,
      showProductName: options?.showProductName ?? true,
      showVariantName: options?.showVariantName ?? true,
      showSku: options?.showSku ?? true,
      showLogo: options?.showLogo ?? false,
      priceMode,
    };
  }

  private normalizePriceMode(
    priceMode: LabelOptionsDto['priceMode'] | undefined,
    showPrice: boolean | undefined,
  ): LabelPriceMode {
    if (showPrice === false) return 'none';
    if (priceMode === 'normal' || priceMode === 'transfer' || priceMode === 'both' || priceMode === 'none') {
      return priceMode;
    }

    return 'normal';
  }

  private serializeVariant(variant: any, storeId: number) {
    const inventory = variant.inventories?.find((item: { storeId: number }) => item.storeId === storeId);
    const image = variant.product.images?.[0]?.url ?? null;

    return {
      id: variant.id,
      productId: variant.productId,
      productName: variant.product.title,
      variantName: [variant.Color, variant.Size].filter(Boolean).join(' '),
      sku: variant.sku,
      stock: inventory?.quantity ?? 0,
      price: Number(variant.price),
      imageUrl: image,
      active: Boolean(variant.product.published),
      categories: variant.product.categories?.map((entry: any) => entry.category) ?? [],
    };
  }

  private parseIdList(value?: string) {
    return [
      ...new Set(
        (value ?? '')
          .split(',')
          .map((item) => Number(item.trim()))
          .filter((item) => Number.isInteger(item) && item > 0),
      ),
    ];
  }

  private async getPriceSettings(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { bankTransferDiscountPercentage: true },
    });
    const bankTransferDiscountPercentage = this.normalizeDiscountPercentage(
      store?.bankTransferDiscountPercentage,
    );

    return {
      hasTransferPrice: bankTransferDiscountPercentage > 0,
      bankTransferDiscountPercentage,
    };
  }

  private normalizeDiscountPercentage(value: number | null | undefined) {
    return Math.max(0, Math.min(Number(value ?? 0) || 0, 100));
  }

  private resolveTransferPrice(price: number, discountPercentage: number) {
    if (!Number.isFinite(price) || price <= 0 || discountPercentage <= 0) return null;
    return Math.max(0, Math.round(price * (1 - discountPercentage / 100)));
  }

  private formatMoney(value: Prisma.Decimal | number) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(Number(value));
  }
}
