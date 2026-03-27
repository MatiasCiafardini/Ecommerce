import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { generateSlug } from '../../common/utils/slug.util';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateProductDto, storeId: number) {
    const slug = generateSlug(data.title);
    await this.ensureSlugAvailable(slug, storeId);

    return this.prisma.product.create({
      data: {
        title: data.title,
        description: data.description,
        slug,
        published: data.published ?? false,
        storeId,
      },
    });
  }

  findAll(storeId: number) {
    return this.prisma.product.findMany({
      where: {
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

  async update(productId: number, data: UpdateProductDto, storeId: number) {
    const payload: {
      title?: string;
      description?: string | null;
      published?: boolean;
      slug?: string;
    } = {};

    if (data.title !== undefined) {
      const slug = generateSlug(data.title);
      await this.ensureSlugAvailable(slug, storeId, productId);
      payload.title = data.title;
      payload.slug = slug;
    }

    if (data.description !== undefined) {
      payload.description = data.description ?? null;
    }

    if (data.published !== undefined) {
      payload.published = data.published;
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
        deletedAt: null,
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
}
