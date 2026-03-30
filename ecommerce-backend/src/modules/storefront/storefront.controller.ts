import {
  BadRequestException,
  Put,
  Controller,
  Get,
  Post,
  Body,
  Req,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { ApiTags, ApiSecurity } from '@nestjs/swagger';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { GetStoreProductsDto } from './dto/get-store-products.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { uploadsDir } from '../../common/uploads';

@ApiSecurity('x-store-id')
@ApiTags('Storefront')
@Controller('store')
export class StorefrontController {
  constructor(private storefrontService: StorefrontService) {}

  @Get('config')
  getConfig(@Req() req) {
    return this.storefrontService.getStoreConfig(req.storeId, req.headers.host);
  }

  @Get('payment-config')
  getPaymentConfig(@Req() req) {
    return this.storefrontService.getPaymentConfig(req.storeId);
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin/config')
  getAdminConfig(@Req() req) {
    return this.storefrontService.getAdminStorefrontConfig(req.storeId);
  }

  @UseGuards(AdminAuthGuard)
  @Put('admin/config')
  updateAdminConfig(@Req() req, @Body() body: { storefrontConfig?: unknown }) {
    return this.storefrontService.updateAdminStorefrontConfig(
      req.storeId,
      body?.storefrontConfig,
    );
  }

  @UseGuards(AdminAuthGuard)
  @Get('admin/integrations')
  getAdminIntegrations(@Req() req) {
    return this.storefrontService.getAdminIntegrationsConfig(req.storeId);
  }

  @UseGuards(AdminAuthGuard)
  @Put('admin/integrations/mercadopago')
  updateAdminMercadoPagoIntegration(
    @Req() req,
    @Body()
    body: {
      publicKey?: string | null;
      accessToken?: string | null;
      webhookSecret?: string | null;
    },
  ) {
    return this.storefrontService.updateAdminMercadoPagoConfig(req.storeId, body);
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/integrations/mercadopago/test')
  testAdminMercadoPagoIntegration(@Req() req) {
    return this.storefrontService.testAdminMercadoPagoConfig(req.storeId);
  }

  @UseGuards(AdminAuthGuard)
  @Post('admin/assets/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (_, file, callback) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          callback(
            null,
            `storefront-${uniqueSuffix}${extname(file.originalname)}`,
          );
        },
      }),
      fileFilter: (_, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        const allowedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

        if (!allowedExtensions.has(extension) || !file.mimetype.startsWith('image/')) {
          callback(
            new BadRequestException(
              'Only PNG, JPG, JPEG and WEBP images are supported',
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
  uploadAdminAsset(@UploadedFile() file?: { filename: string }) {
    if (!file?.filename) {
      throw new BadRequestException('Image file is required');
    }

    return {
      url: `/uploads/${file.filename}`,
    };
  }

  @Get('products')
  getProducts(@Req() req, @Query() query: GetStoreProductsDto) {
    return this.storefrontService.getProducts(req.storeId, query);
  }

  @Get('options')
  getStoreProductOptions(@Req() req) {
    return this.storefrontService.getStoreProductOptions(req.storeId);
  }

  @Get('products/:slug')
  getProduct(@Param('slug') slug: string, @Req() req) {
    return this.storefrontService.getProduct(slug, req.storeId);
  }

  @Get('products/:slug/options')
  getProductOptions(@Param('slug') slug: string, @Req() req) {
    return this.storefrontService.getProductOptions(slug, req.storeId);
  }

  @Get('categories')
  getCategories(@Req() req) {
    return this.storefrontService.getCategories(req.storeId);
  }

  @Get('categories/:slug/products')
  getProductsByCategory(
    @Param('slug') slug: string,
    @Req() req,
    @Query() query: GetStoreProductsDto,
  ) {
    return this.storefrontService.getProductsByCategory(slug, req.storeId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Post('orders')
  createOrder(@Body() dto: CreateOrderDto, @Req() req) {
    return this.storefrontService.createOrder(
      { ...dto, customerId: req.user.sub },
      req.storeId,
    );
  }
}
