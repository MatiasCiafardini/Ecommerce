import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { generateSlug } from '../../common/utils/slug.util';
import { UpdateCategoryDto } from './dto/update-category.dto';

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
        imageUrl: dto.imageUrl?.trim() || null,
        storeId,
      },
    });
  }

  async update(id: number, dto: UpdateCategoryDto, storeId: number) {
    const current = await this.prisma.category.findFirst({
      where: {
        id,
        storeId,
        deletedAt: null,
      },
    });

    if (!current) {
      throw new NotFoundException('Category not found');
    }

    let slug = current.slug;

    if (dto.name && dto.name.trim() && dto.name.trim() !== current.name) {
      const baseSlug = generateSlug(dto.name);
      slug = baseSlug;
      let counter = 1;

      while (
        await this.prisma.category.findFirst({
          where: {
            storeId,
            id: { not: id },
            slug,
          },
        })
      ) {
        slug = `${baseSlug}-${counter++}`;
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name?.trim() || current.name,
        slug,
        imageUrl:
          dto.imageUrl !== undefined ? dto.imageUrl.trim() || null : current.imageUrl,
      },
    });
  }

  findAll(storeId: number) {
    return this.prisma.category.findMany({
      where: {
        storeId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            products: {
              where: {
                product: {
                  deletedAt: null,
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    }).then((categories) =>
      categories.map(({ _count, ...category }) => ({
        ...category,
        productsCount: _count.products,
      })),
    );
  }

  async remove(id: number, storeId: number) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        storeId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productCategory.deleteMany({
        where: {
          categoryId: id,
        },
      });

      await tx.category.update({
        where: {
          id,
        },
        data: {
          deletedAt: new Date(),
        },
      });
    });

    return { success: true };
  }
}
