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
import { CheckProductSkusDto } from './dto/check-product-skus.dto';
import { ApiTags, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { CatalogManagerGuard } from '../auth/guards/catalog-manager.guard';

@ApiSecurity('x-store-id')
@ApiBearerAuth('jwt')
@ApiTags('Products')
@UseGuards(AdminAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  @UseGuards(CatalogManagerGuard)
  create(@Body() dto: CreateProductDto, @Req() req) {
    return this.productsService.create(dto, req.storeId, req.user);
  }

  @Post('save-complete')
  @UseGuards(CatalogManagerGuard)
  createComplete(@Body() dto: SaveProductCompleteDto, @Req() req) {
    return this.productsService.saveComplete(undefined, dto, req.storeId, req.user);
  }

  @Get()
  findAll(
    @Req() req,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAll(req.storeId, search, limit);
  }

  @Get('admin/catalog')
  findAdminCatalog(
    @Req() req,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('includeMetrics') includeMetrics?: string,
  ) {
    return this.productsService.findAdminCatalog(req.storeId, {
      search,
      categoryId,
      status,
      page,
      pageSize,
      includeMetrics,
    });
  }

  @Post('admin/skus/check')
  @UseGuards(CatalogManagerGuard)
  checkSkus(@Body() dto: CheckProductSkusDto, @Req() req) {
    return this.productsService.checkSkus(dto.candidates, req.storeId);
  }

  @Get('admin/:id')
  @UseGuards(CatalogManagerGuard)
  findAdminOne(@Param('id') id: string, @Req() req) {
    return this.productsService.findOne(Number(id), req.storeId);
  }

  @Patch(':id')
  @UseGuards(CatalogManagerGuard)
  update(@Param('id') id: string, @Body() dto: UpdateProductDto, @Req() req) {
    return this.productsService.update(Number(id), dto, req.storeId, req.user);
  }

  @Patch(':id/save-complete')
  @UseGuards(CatalogManagerGuard)
  updateComplete(
    @Param('id') id: string,
    @Body() dto: SaveProductCompleteDto,
    @Req() req,
  ) {
    return this.productsService.saveComplete(Number(id), dto, req.storeId, req.user);
  }

  @Delete(':id')
  @UseGuards(CatalogManagerGuard)
  remove(@Param('id') id: string, @Req() req) {
    return this.productsService.remove(Number(id), req.storeId, req.user);
  }

  @Get(':id/audit')
  @UseGuards(CatalogManagerGuard)
  getAuditLogs(
    @Param('id') id: string,
    @Req() req,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.getAuditLogs(Number(id), req.storeId, limit);
  }

  @Post(':id/categories/:categoryId')
  @UseGuards(CatalogManagerGuard)
  addCategory(
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
    @Req() req,
  ) {
    return this.productsService.addCategory(Number(id), Number(categoryId), req.storeId, req.user);
  }

  @Delete(':id/categories/:categoryId')
  @UseGuards(CatalogManagerGuard)
  removeCategory(
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
    @Req() req,
  ) {
    return this.productsService.removeCategory(Number(id), Number(categoryId), req.storeId, req.user);
  }

  @Get(':id/categories')
  getCategories(@Param('id') id: string, @Req() req) {
    return this.productsService.getCategories(Number(id), req.storeId);
  }
}
