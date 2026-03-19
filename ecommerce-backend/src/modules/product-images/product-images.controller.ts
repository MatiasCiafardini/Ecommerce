import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Delete,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductImagesService } from './product-images.service';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { ApiTags, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

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
        destination: './uploads',
        filename: (_, file, callback) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  upload(
    @Param('productId') productId: string,
    @UploadedFile() file: { filename: string },
  ) {
    return this.service.create(Number(productId), {
      url: `/uploads/${file.filename}`,
    });
  }

  @Post()
  create(
    @Param('productId') productId: string,
    @Body() dto: CreateProductImageDto,
  ) {
    return this.service.create(Number(productId), dto);
  }

  @Get()
  findAll(@Param('productId') productId: string) {
    return this.service.findByProduct(Number(productId));
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.delete(Number(id));
  }
}
