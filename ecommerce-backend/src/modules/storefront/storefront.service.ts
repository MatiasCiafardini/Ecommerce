import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CreateOrderDto } from '../orders/dto/create-order.dto';

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
  getProducts(storeId: number) {
    return this.prisma.product.findMany({
      where: {
        storeId,
        published: true,
      },
      include: {
        images: true,
        variants: {
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

  getCategories(storeId: number) {
    return this.prisma.category.findMany({
      where: { storeId },
    });
  }

  async getProductsByCategory(slug: string, storeId: number) {
    const category = await this.prisma.category.findFirst({
      where: {
        slug,
        storeId,
      },
      include: {
        products: {
          include: {
            product: {
              include: {
                images: true,
                variants: {
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
            },
          },
        },
      },
    });

    if (!category) return [];

    return category.products
      .map((p) => p.product)
      .filter((product) => product.published);
  }

  createOrder(dto: CreateOrderDto, storeId: number) {
    return this.ordersService.create(dto, storeId);
  }
}
