import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import type { ProductImage } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { uploadsDir, uploadsPublicPath } from '../../common/uploads';
import {
  CatalogAuditService,
  type CatalogAuditActor,
} from '../catalog-audit/catalog-audit.service';
import { ImportDriveProductImageItemDto } from './dto/import-drive-product-image.dto';

const DRIVE_ALLOWED_MIMETYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);
const DRIVE_EXTENSION_BY_MIMETYPE: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};
const DRIVE_MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type DriveFileMetadata = {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: string;
};

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

  private async fetchDriveMetadata(
    fileId: string,
    accessToken: string,
  ): Promise<DriveFileMetadata> {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        fileId,
      )}?fields=id,name,mimeType,size`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new BadRequestException(
        'No se pudo leer la informacion de la imagen de Drive.',
      );
    }

    return response.json() as Promise<DriveFileMetadata>;
  }

  private async downloadDriveFile(
    fileId: string,
    accessToken: string,
  ): Promise<Buffer> {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        fileId,
      )}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new BadRequestException(
        'No se pudo descargar la imagen seleccionada desde Drive.',
      );
    }

    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > DRIVE_MAX_IMAGE_BYTES) {
      throw new BadRequestException(
        'Una imagen de Drive supera el limite de 8 MB.',
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > DRIVE_MAX_IMAGE_BYTES) {
      throw new BadRequestException(
        'Una imagen de Drive supera el limite de 8 MB.',
      );
    }

    return Buffer.from(arrayBuffer);
  }

  private getDriveImageExtension(metadata: DriveFileMetadata) {
    const mimeType = metadata.mimeType ?? '';
    const extension = DRIVE_EXTENSION_BY_MIMETYPE[mimeType];

    if (extension) {
      return extension;
    }

    const nameExtension = extname(metadata.name ?? '').toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(nameExtension)) {
      return nameExtension === '.jpeg' ? '.jpg' : nameExtension;
    }

    return '.jpg';
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

  async importFromDrive(
    productId: number,
    files: ImportDriveProductImageItemDto[],
    accessToken: string,
    storeId: number,
    actor?: CatalogAuditActor,
  ) {
    const importedImages: ProductImage[] = [];

    for (const file of files) {
      const metadata = await this.fetchDriveMetadata(file.fileId, accessToken);

      if (!DRIVE_ALLOWED_MIMETYPES.has(metadata.mimeType ?? '')) {
        throw new BadRequestException(
          'Solo se pueden importar imagenes PNG, JPG o WebP desde Drive.',
        );
      }

      const metadataSize = Number(metadata.size ?? 0);
      if (metadataSize > DRIVE_MAX_IMAGE_BYTES) {
        throw new BadRequestException(
          'Una imagen de Drive supera el limite de 8 MB.',
        );
      }

      const buffer = await this.downloadDriveFile(file.fileId, accessToken);
      const filename = `${Date.now()}-${randomUUID()}${this.getDriveImageExtension(
        metadata,
      )}`;
      const uploadPath = join(uploadsDir, filename);

      try {
        await writeFile(uploadPath, buffer);
        const image = await this.create(
          productId,
          {
            url: `${uploadsPublicPath}/${filename}`,
            position: file.position,
            offsetX: file.offsetX,
            offsetY: file.offsetY,
            zoom: file.zoom,
          },
          storeId,
          actor,
        );
        importedImages.push(image);
      } catch (error) {
        await unlink(uploadPath).catch(() => null);
        throw error;
      }
    }

    return importedImages;
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
