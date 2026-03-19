import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { ProductOptionsService } from './product-options.service';
import { CreateProductOptionDto } from './dto/create-product-option.dto';
import { AddProductOptionValueDto } from './dto/add-product-option-value.dto';

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
