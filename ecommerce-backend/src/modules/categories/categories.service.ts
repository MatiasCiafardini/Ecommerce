import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { generateSlug } from '../../common/utils/slug.util';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto, storeId: number) {
    const baseSlug = generateSlug(dto.name);

    let slug = baseSlug;
    let counter = 1;

    while (
      await this.prisma.category.findFirst({
        where: { slug, storeId },
      })
    ) {
      slug = `${baseSlug}-${counter++}`;
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        storeId,
      },
    });
  }

  findAll(storeId: number) {
    return this.prisma.category.findMany({
      where: {
        storeId,
        deletedAt: null,
      },
    });
  }
}
