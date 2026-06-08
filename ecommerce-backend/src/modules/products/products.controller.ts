import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Req,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SaveProductCompleteDto } from './dto/save-product-complete.dto';
import { ApiTags, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

@ApiSecurity('x-store-id')
@ApiBearerAuth('jwt')
@ApiTags('Products')
@UseGuards(AdminAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  create(@Body() dto: CreateProductDto, @Req() req) {
    return this.productsService.create(dto, req.storeId);
  }

  @Post('save-complete')
  createComplete(@Body() dto: SaveProductCompleteDto, @Req() req) {
    return this.productsService.saveComplete(undefined, dto, req.storeId);
  }

  @Get()
  findAll(
    @Req() req,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAll(req.storeId, search, limit);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @Req() req) {
    return this.productsService.update(Number(id), dto, req.storeId);
  }

  @Patch(':id/save-complete')
  updateComplete(
    @Param('id') id: string,
    @Body() dto: SaveProductCompleteDto,
    @Req() req,
  ) {
    return this.productsService.saveComplete(Number(id), dto, req.storeId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.productsService.remove(Number(id), req.storeId);
  }

  @Post(':id/categories/:categoryId')
  addCategory(
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
    @Req() req,
  ) {
    return this.productsService.addCategory(Number(id), Number(categoryId), req.storeId);
  }

  @Delete(':id/categories/:categoryId')
  removeCategory(
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
    @Req() req,
  ) {
    return this.productsService.removeCategory(Number(id), Number(categoryId), req.storeId);
  }

  @Get(':id/categories')
  getCategories(@Param('id') id: string, @Req() req) {
    return this.productsService.getCategories(Number(id), req.storeId);
  }
}
