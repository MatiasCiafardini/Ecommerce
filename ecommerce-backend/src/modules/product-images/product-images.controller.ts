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
import { ProductImagesService } from './product-images.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { ApiTags, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { uploadsDir } from '../../common/uploads';

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
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        const allowedExtensions = new Set(['.png', '.jpg', '.jpeg']);

        if (!allowedExtensions.has(extension)) {
          callback(
            new BadRequestException(
              'Only PNG, JPG and JPEG files are supported',
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
  upload(
    @Param('productId') productId: string,
    @Body() dto: UploadProductImageDto,
    @UploadedFile() file: { filename: string },
    @Req() req,
  ) {
    return this.service.create(Number(productId), {
      url: `/uploads/${file.filename}`,
      position: dto.position,
      offsetX: dto.offsetX,
      offsetY: dto.offsetY,
      zoom: dto.zoom,
    }, req.storeId);
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
