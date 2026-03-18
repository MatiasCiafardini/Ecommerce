import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductOptionDto } from './dto/create-product-option.dto';
import { AddProductOptionValueDto } from './dto/add-product-option-value.dto';

@Injectable()
export class ProductOptionsService {
  constructor(private prisma: PrismaService) {}

  async createOption(storeId: number, dto: CreateProductOptionDto) {
    const normalizedName = dto.name.trim();

    const existing = await this.prisma.productOption.findFirst({
      where: {
        storeId,
        name: {
          equals: normalizedName,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Product option already exists');
    }

    return this.prisma.productOption.create({
      data: {
        storeId,
        name: normalizedName,
      },
    });
  }

  async addValueToProduct(
    storeId: number,
    productId: number,
    dto: AddProductOptionValueDto,
  ) {
    const normalizedValue = dto.value.trim();

    const [product, option] = await Promise.all([
      this.prisma.product.findFirst({
        where: {
          id: productId,
          storeId,
        },
        select: { id: true },
      }),
      this.prisma.productOption.findFirst({
        where: {
          id: dto.productOptionId,
          storeId,
        },
        select: { id: true, name: true },
      }),
    ]);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!option) {
      throw new NotFoundException('Product option not found');
    }

    const existing = await this.prisma.productOptionValue.findFirst({
      where: {
        productId,
        productOptionId: dto.productOptionId,
        value: {
          equals: normalizedValue,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Product option value already exists');
    }

    return this.prisma.productOptionValue.create({
      data: {
        productId,
        productOptionId: dto.productOptionId,
        value: normalizedValue,
      },
      include: {
        productOption: true,
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });
  }
}
