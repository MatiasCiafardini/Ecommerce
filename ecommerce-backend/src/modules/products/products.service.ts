import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
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
        variants: true,
        images: true,
        categories: {
          include: {
            category: true,
          },
        },
      },
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
