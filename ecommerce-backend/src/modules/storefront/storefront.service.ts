import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { GetStoreProductsDto } from './dto/get-store-products.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class StorefrontService {
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
  ) {}
  async getStoreConfig(domain: string) {
    const normalizedDomain = domain?.split(':')[0]?.toLowerCase();
    const store = await this.prisma.store.findUnique({
      where: { domain: normalizedDomain },
    });

    if (!store) {
      throw new Error('Store not found');
    }

    return {
      storeId: store.id,
      theme: 'minimal',
    };
  }
  async getProducts(storeId: number, query?: GetStoreProductsDto) {
    const where = await this.buildProductsWhere(storeId, query);

    return this.prisma.product.findMany({
      where,
      include: this.productInclude(storeId),
    });
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

  getProduct(slug: string, storeId: number) {
    return this.prisma.product.findFirst({
      where: {
        slug,
        storeId,
        published: true,
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
          include: {
            category: true,
          },
        },
      },
    });
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
      where: { storeId },
    });
  }

  async getProductsByCategory(
    slug: string,
    storeId: number,
    query?: GetStoreProductsDto,
  ) {
    const where = await this.buildProductsWhere(storeId, query, slug);

    return this.prisma.product.findMany({
      where,
      include: this.productInclude(storeId),
    });
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
        include: {
          category: true,
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
    };

    if (categorySlug) {
      where.categories = {
        some: {
          category: {
            slug: categorySlug,
            storeId,
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
