import {
  BadRequestException,
  Controller,
  Post,
  Body,
  Param,
  Get,
  Delete,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join, extname } from 'path';
import { ProductImagesService } from './product-images.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { ApiTags, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { uploadsDir } from '../../common/uploads';

const MAX_IMAGES_PER_PRODUCT = 10;

const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const ALLOWED_MIMETYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

interface UploadedImageFile {
  filename: string;
  mimetype: string;
  path: string;
  size: number;
}

@ApiSecurity('x-store-id')
@ApiBearerAuth('jwt')
@ApiTags('Product Images')
@UseGuards(AdminAuthGuard)
@Controller('products/:productId/images')
export class ProductImagesController {
  constructor(private service: ProductImagesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (_, file, callback) => {
          const ext = ALLOWED_EXTENSIONS.has(extname(file.originalname).toLowerCase())
            ? extname(file.originalname).toLowerCase()
            : '.jpg';
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(null, `${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (_, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.has(extension)) {
          callback(
            new BadRequestException(
              'Solo se permiten imágenes PNG, JPG, JPEG o WebP',
            ) as Error,
            false,
          );
          return;
        }
        if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
          callback(
            new BadRequestException(
              'El archivo no es una imagen válida',
            ) as Error,
            false,
          );
          return;
        }
        callback(null, true);
      },
      limits: {
        fileSize: 8 * 1024 * 1024,
      },
    }),
  )
  async upload(
    @Param('productId') productId: string,
    @Body() dto: UploadProductImageDto,
    @UploadedFile() file: UploadedImageFile,
    @Req() req,
  ) {
    const productIdNum = Number(productId);

    const existingCount = await this.service.countByProduct(productIdNum, req.storeId);
    if (existingCount >= MAX_IMAGES_PER_PRODUCT) {
      await unlink(join(uploadsDir, file.filename)).catch(() => null);
      throw new BadRequestException(
        `El producto ya tiene el máximo de ${MAX_IMAGES_PER_PRODUCT} imágenes`,
      );
    }

    try {
      return await this.service.create(productIdNum, {
        url: `/uploads/${file.filename}`,
        position: dto.position,
        offsetX: dto.offsetX,
        offsetY: dto.offsetY,
        zoom: dto.zoom,
      }, req.storeId);
    } catch (error) {
      await unlink(join(uploadsDir, file.filename)).catch(() => null);
      throw error;
    }
  }

  @Post()
  create(
    @Param('productId') productId: string,
    @Body() dto: CreateProductImageDto,
    @Req() req,
  ) {
    return this.service.create(Number(productId), dto, req.storeId);
  }

  @Get()
  findAll(@Param('productId') productId: string, @Req() req) {
    return this.service.findByProduct(Number(productId), req.storeId);
  }

  @Patch(':id')
  update(
    @Param('productId') productId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductImageDto,
    @Req() req,
  ) {
    return this.service.update(Number(id), Number(productId), dto, req.storeId);
  }

  @Delete(':id')
  remove(@Param('productId') productId: string, @Param('id') id: string, @Req() req) {
    return this.service.delete(Number(id), Number(productId), req.storeId);
  }
}
