import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { generateSlug } from '../../common/utils/slug.util';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private normalizeCategoryName(name: string | undefined | null) {
    const normalizedName = name?.trim() ?? '';

    if (!normalizedName) {
      throw new BadRequestException('Category name is required');
    }

    return normalizedName;
  }

  async create(dto: CreateCategoryDto, storeId: number) {
    const name = this.normalizeCategoryName(dto.name);

    await this.ensureValidParent(dto.parentId, storeId);
    const baseSlug = generateSlug(name);

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
        name,
        slug,
        description: dto.description?.trim() || null,
        status: dto.status ?? 'active',
        parentId: dto.parentId ?? null,
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

    const nextParentId = dto.parentId === undefined ? current.parentId : dto.parentId;
    await this.ensureValidParent(nextParentId, storeId, id);

    let slug = current.slug;

    const nextName = dto.name === undefined ? current.name : this.normalizeCategoryName(dto.name);

    if (nextName !== current.name) {
      const baseSlug = generateSlug(nextName);
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
        name: nextName,
        slug,
        description:
          dto.description !== undefined ? dto.description?.trim() || null : current.description,
        status: dto.status ?? current.status,
        parentId: nextParentId ?? null,
        imageUrl:
          dto.imageUrl !== undefined ? dto.imageUrl?.trim() || null : current.imageUrl,
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
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          where: { deletedAt: null },
          select: {
            id: true,
          },
        },
        products: {
          where: {
            product: {
              deletedAt: null,
            },
          },
          include: {
            product: {
              select: {
                id: true,
                title: true,
                slug: true,
                published: true,
                variants: {
                  where: { deletedAt: null },
                  select: {
                    inventories: {
                      select: {
                        quantity: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
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
      categories.map(({ _count, products, children, ...category }) => ({
        ...category,
        childrenCount: children.length,
        productsCount: _count.products,
        publishedProductsCount: products.filter((entry) => entry.product.published).length,
        outOfStockProductsCount: products.filter(
          (entry) =>
            entry.product.variants.reduce(
              (sum, variant) =>
                sum + Number(variant.inventories?.[0]?.quantity ?? 0),
              0,
            ) <= 0,
        ).length,
        products: products.map((entry) => ({
          id: entry.product.id,
          title: entry.product.title,
          slug: entry.product.slug,
        })),
      })),
    );
  }

  async remove(id: number, storeId: number, reassignToId?: number) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        storeId,
        deletedAt: null,
      },
      select: {
        id: true,
        products: {
          select: {
            productId: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (reassignToId) {
      if (reassignToId === id) {
        throw new BadRequestException('Cannot reassign to the same category');
      }
      await this.ensureValidParent(reassignToId, storeId);
    }

    await this.prisma.$transaction(async (tx) => {
      if (reassignToId) {
        await tx.productCategory.createMany({
          data: category.products.map((entry) => ({
            productId: entry.productId,
            categoryId: reassignToId,
          })),
          skipDuplicates: true,
        });
      }

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

  private async ensureValidParent(
    parentId: number | null | undefined,
    storeId: number,
    categoryId?: number,
  ) {
    if (!parentId) {
      return;
    }

    if (categoryId && parentId === categoryId) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    const parent = await this.prisma.category.findFirst({
      where: {
        id: parentId,
        storeId,
        deletedAt: null,
      },
      select: { id: true, parentId: true },
    });

    if (!parent) {
      throw new NotFoundException('Parent category not found');
    }

    if (!categoryId) {
      return;
    }

    let cursor = parent.parentId;
    while (cursor) {
      if (cursor === categoryId) {
        throw new BadRequestException('Category hierarchy cannot contain cycles');
      }
      const next = await this.prisma.category.findFirst({
        where: { id: cursor, storeId, deletedAt: null },
        select: { parentId: true },
      });
      cursor = next?.parentId ?? null;
    }
  }
}
