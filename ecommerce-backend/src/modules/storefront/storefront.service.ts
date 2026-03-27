import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { GetStoreProductsDto } from './dto/get-store-products.dto';
import { Prisma } from '@prisma/client';
import { ProductPricingService } from '../discounts/product-pricing.service';
import { MercadoPagoProvider } from '../payments/providers/mercadopago.provider';

@Injectable()
export class StorefrontService {
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private productPricingService: ProductPricingService,
    private mercadoPagoProvider: MercadoPagoProvider,
  ) {}
  async getStoreConfig(domain: string) {
    const normalizedDomain = this.normalizeStoreDomain(domain);
    const store = await this.prisma.store.findUnique({
      where: { domain: normalizedDomain },
    });

    if (!store) {
      throw new Error('Store not found');
    }

    return {
      storeId: store.id,
      theme: 'minimal',
      paymentProviders: {
        mercadopago: await this.mercadoPagoProvider.getPublicConfig(store.id),
      },
    };
  }

  async getPaymentConfig(storeId: number) {
    return {
      mercadopago: await this.mercadoPagoProvider.getPublicConfig(storeId),
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
    if (!optionValueIds) {
      return [];
    }

    return [...new Set(optionValueIds
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0))];
  }
}
