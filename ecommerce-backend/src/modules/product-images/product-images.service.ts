import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';

@Injectable()
export class ProductImagesService {
  constructor(private prisma: PrismaService) {}

  create(productId: number, dto: CreateProductImageDto) {
    return this.prisma.productImage.create({
      data: {
        productId,
        url: dto.url,
        position: dto.position ?? 0,
      },
    });
  }

  findByProduct(productId: number) {
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
    });
  }

  delete(id: number) {
    return this.prisma.productImage.delete({
      where: { id },
    });
  }
}
