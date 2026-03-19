import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { generateSlug } from '../../common/utils/slug.util';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  create(data: CreateProductDto, storeId: number) {
    const slug = generateSlug(data.title);

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
      },
      include: {
        variants: {
          where: {
            deletedAt: null,
          },
        },
        images: true,
        categories: {
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
      payload.title = data.title;
      payload.slug = generateSlug(data.title);
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
        },
        include: {
          variants: {
            where: {
              deletedAt: null,
            },
          },
          images: true,
          categories: {
            include: {
              category: true,
            },
          },
        },
      });
    });
  }

  async addCategory(productId: number, categoryId: number) {
    return this.prisma.productCategory.create({
      data: {
        productId,
        categoryId,
      },
    });
  }

  async removeCategory(productId: number, categoryId: number) {
    return this.prisma.productCategory.delete({
      where: {
        productId_categoryId: {
          productId,
          categoryId,
        },
      },
    });
  }

  async getCategories(productId: number) {
    return this.prisma.productCategory.findMany({
      where: { productId },
      include: {
        category: true,
      },
    });
  }
}
