import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Req,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ApiTags, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiSecurity('x-store-id')
@ApiBearerAuth('jwt')
@ApiTags('Products')
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  create(@Body() dto: CreateProductDto, @Req() req) {
    return this.productsService.create(dto, req.storeId);
  }

  @Get()
  findAll(@Req() req) {
    return this.productsService.findAll(req.storeId);
  }

  @Post(':id/categories/:categoryId')
  addCategory(
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.productsService.addCategory(Number(id), Number(categoryId));
  }

  @Delete(':id/categories/:categoryId')
  removeCategory(
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.productsService.removeCategory(Number(id), Number(categoryId));
  }

  @Get(':id/categories')
  getCategories(@Param('id') id: string) {
    return this.productsService.getCategories(Number(id));
  }
}
