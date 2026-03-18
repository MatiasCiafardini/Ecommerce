import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { ApiTags, ApiSecurity } from '@nestjs/swagger';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetStoreProductsDto } from './dto/get-store-products.dto';

@ApiSecurity('x-store-id')
@ApiTags('Storefront')
@Controller('store')
export class StorefrontController {
  constructor(private storefrontService: StorefrontService) {}

  @Get('config')
  getConfig(@Req() req) {
    return this.storefrontService.getStoreConfig(req.headers.host);
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
