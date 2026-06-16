import { Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { uploadsDir, uploadsPublicPath } from '../../common/uploads';
import {
  CatalogAuditService,
  type CatalogAuditActor,
} from '../catalog-audit/catalog-audit.service';

@Injectable()
export class ProductImagesService {
  constructor(
    private prisma: PrismaService,
    private catalogAudit: CatalogAuditService,
  ) {}

  private async tryDeleteUploadFile(url: string): Promise<void> {
    if (!url.startsWith(uploadsPublicPath + '/')) {
      return;
    }
    const filename = url.slice(uploadsPublicPath.length + 1);
    if (!filename || filename.includes('/') || filename.includes('..')) {
      return;
    }
    try {
      await unlink(join(uploadsDir, filename));
    } catch {
      // File may already be gone — not a fatal error
    }
  }

  async countByProduct(productId: number, storeId: number): Promise<number> {
    return this.prisma.productImage.count({
      where: {
        productId,
        product: { storeId, deletedAt: null },
      },
    });
  }

  async create(
    productId: number,
    dto: CreateProductImageDto,
    storeId: number,
    actor?: CatalogAuditActor,
  ) {
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

    return this.prisma.$transaction(async (tx) => {
      const image = await tx.productImage.create({
        data: {
          productId,
          url: dto.url,
          position: dto.position ?? 0,
          offsetX: dto.offsetX ?? 0,
          offsetY: dto.offsetY ?? 0,
          zoom: dto.zoom ?? 1,
        },
      });

      await this.catalogAudit.create({
        storeId,
        productId,
        action: 'product_image.created',
        entity: 'productImage',
        entityId: image.id,
        actor,
        after: image,
      }, tx);

      return image;
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

  async update(
    id: number,
    productId: number,
    dto: UpdateProductImageDto,
    storeId: number,
    actor?: CatalogAuditActor,
  ) {
    const image = await this.prisma.productImage.findFirst({
      where: {
        id,
        productId,
        product: {
          storeId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        productId: true,
        url: true,
        position: true,
        offsetX: true,
        offsetY: true,
        zoom: true,
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found in this store');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.productImage.update({
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

      await this.catalogAudit.create({
        storeId,
        productId,
        action: 'product_image.updated',
        entity: 'productImage',
        entityId: id,
        actor,
        before: image,
        after: updated,
        metadata: { fields: Object.keys(dto) },
      }, tx);

      return updated;
    });
  }

  async delete(
    id: number,
    productId: number,
    storeId: number,
    actor?: CatalogAuditActor,
  ) {
    const image = await this.prisma.productImage.findFirst({
      where: {
        id,
        productId,
        product: {
          storeId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        productId: true,
        url: true,
        position: true,
        offsetX: true,
        offsetY: true,
        zoom: true,
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found in this store');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id } });
      await this.catalogAudit.create({
        storeId,
        productId,
        action: 'product_image.deleted',
        entity: 'productImage',
        entityId: id,
        actor,
        before: image,
      }, tx);
    });
    await this.tryDeleteUploadFile(image.url);
  }
}
