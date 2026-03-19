import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ProductVariantsService } from './product-variants.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { ApiTags, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

@ApiSecurity('x-store-id')
@ApiBearerAuth('jwt')
@ApiTags('Variants')
@UseGuards(AdminAuthGuard)
@Controller('variants')
export class ProductVariantsController {
  constructor(private variantsService: ProductVariantsService) {}

  @Post()
  create(@Body() createVariantDto: CreateVariantDto, @Req() req) {
    return this.variantsService.create(createVariantDto, req.storeId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVariantDto: UpdateVariantDto,
    @Req() req,
  ) {
    return this.variantsService.update(
      Number(id),
      updateVariantDto,
      req.storeId,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.variantsService.remove(Number(id), req.storeId);
  }

  @Get(':productId')
  findByProduct(@Param('productId') productId: string, @Req() req) {
    return this.variantsService.findByProduct(Number(productId), req.storeId);
  }
}
