import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
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
}
