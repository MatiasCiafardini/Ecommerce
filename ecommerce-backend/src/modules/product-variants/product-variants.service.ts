import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';

@Injectable()
export class ProductVariantsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateVariantDto, storeId: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: data.productId,
        storeId: storeId,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found in this store');
    }

    return this.prisma.productVariant.create({
      data: {
        productId: data.productId,
        sku: data.sku,
        price: data.price,
      },
    });
  }

  findByProduct(productId: number, storeId: number) {
    return this.prisma.productVariant.findMany({
      where: {
        productId,
        product: {
          storeId: storeId,
        },
      },
    });
  }
}
