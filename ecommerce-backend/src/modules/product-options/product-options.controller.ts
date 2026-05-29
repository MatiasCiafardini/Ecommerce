import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { ProductOptionsService } from './product-options.service';
import { CreateProductOptionDto } from './dto/create-product-option.dto';
import { AddProductOptionValueDto } from './dto/add-product-option-value.dto';
import { UpdateProductOptionDto } from './dto/update-product-option.dto';
import { RenameProductOptionValueDto } from './dto/rename-product-option-value.dto';
import { RemoveProductOptionValueDto } from './dto/remove-product-option-value.dto';
import { CreateReusableOptionValueDto } from './dto/create-reusable-option-value.dto';
import { ReorderReusableOptionValuesDto } from './dto/reorder-reusable-option-values.dto';

@ApiSecurity('x-store-id')
@ApiBearerAuth('jwt')
@ApiTags('Product Options')
@UseGuards(AdminAuthGuard)
@Controller()
export class ProductOptionsController {
  constructor(private readonly service: ProductOptionsService) {}

  @Get('product-options')
  findAllOptions(@Req() req) {
    return this.service.findAllOptions(req.storeId);
  }

  @Post('product-options')
  createOption(@Req() req, @Body() dto: CreateProductOptionDto) {
    return this.service.createOption(req.storeId, dto);
  }

  @Patch('product-options/:id')
  updateOption(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateProductOptionDto,
  ) {
    return this.service.updateOption(req.storeId, Number(id), dto);
  }

  @Delete('product-options/:id')
  deleteOption(
    @Req() req,
    @Param('id') id: string,
    @Query('force') force?: string,
  ) {
    return this.service.deleteOption(req.storeId, Number(id), force === 'true');
  }

  @Delete('product-options/:id/products/:productId')
  unlinkOptionFromProduct(
    @Req() req,
    @Param('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.service.unlinkOptionFromProduct(
      req.storeId,
      Number(id),
      Number(productId),
    );
  }

  @Post('product-options/:id/reusable-values/rename')
  renameReusableValue(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: RenameProductOptionValueDto,
  ) {
    return this.service.renameReusableValue(req.storeId, Number(id), dto);
  }

  @Post('product-options/:id/reusable-values')
  createReusableValue(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: CreateReusableOptionValueDto,
  ) {
    return this.service.createReusableValue(req.storeId, Number(id), dto);
  }

  @Patch('product-options/:id/reusable-values/reorder')
  reorderReusableValues(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: ReorderReusableOptionValuesDto,
  ) {
    return this.service.reorderReusableValues(req.storeId, Number(id), dto);
  }

  @Post('product-options/:id/reusable-values/remove')
  removeReusableValue(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: RemoveProductOptionValueDto,
  ) {
    return this.service.deleteReusableValue(
      req.storeId,
      Number(id),
      dto.value,
      dto.force ?? false,
    );
  }

  @Post('products/:productId/option-values')
  addValueToProduct(
    @Req() req,
    @Param('productId') productId: string,
    @Body() dto: AddProductOptionValueDto,
  ) {
    return this.service.addValueToProduct(req.storeId, Number(productId), dto);
  }

  @Get('products/:productId/option-values')
  findValuesByProduct(@Req() req, @Param('productId') productId: string) {
    return this.service.findValuesByProduct(req.storeId, Number(productId));
  }

  @Delete('products/:productId/option-values/:id')
  removeValueFromProduct(
    @Req() req,
    @Param('productId') productId: string,
    @Param('id') id: string,
  ) {
    return this.service.removeValueFromProduct(
      req.storeId,
      Number(productId),
      Number(id),
    );
  }
}
