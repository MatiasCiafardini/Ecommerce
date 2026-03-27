import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';

@Injectable()
export class ProductImagesService {
  constructor(private prisma: PrismaService) {}

  async create(productId: number, dto: CreateProductImageDto, storeId: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        storeId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found in this store');
    }

    return this.prisma.productImage.create({
      data: {
        productId,
        url: dto.url,
        position: dto.position ?? 0,
        offsetX: dto.offsetX ?? 0,
        offsetY: dto.offsetY ?? 0,
        zoom: dto.zoom ?? 1,
      },
    });
  }

  async findByProduct(productId: number, storeId: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        storeId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found in this store');
    }

    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
    });
  }

  async update(id: number, productId: number, dto: UpdateProductImageDto, storeId: number) {
    const image = await this.prisma.productImage.findFirst({
      where: {
        id,
        productId,
        product: {
          storeId,
          deletedAt: null,
        },
      },
      select: { id: true },
    });

    if (!image) {
      throw new NotFoundException('Image not found in this store');
    }

    return this.prisma.productImage.update({
      where: {
        id,
      },
      data: {
        position: dto.position,
        offsetX: dto.offsetX,
        offsetY: dto.offsetY,
        zoom: dto.zoom,
      },
    });
  }

  async delete(id: number, productId: number, storeId: number) {
    const image = await this.prisma.productImage.findFirst({
      where: {
        id,
        productId,
        product: {
          storeId,
          deletedAt: null,
        },
      },
      select: { id: true },
    });

    if (!image) {
      throw new NotFoundException('Image not found in this store');
    }

    return this.prisma.productImage.delete({
      where: { id },
    });
  }
}
