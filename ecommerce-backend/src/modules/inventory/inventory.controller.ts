import { Controller, Post, Body, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { ApiTags, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { CatalogManagerGuard } from '../auth/guards/catalog-manager.guard';

@ApiSecurity('x-store-id')
@ApiBearerAuth('jwt')
@ApiTags('Inventory')
@UseGuards(AdminAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Post()
  @UseGuards(CatalogManagerGuard)
  create(@Body() dto: CreateInventoryDto, @Req() req) {
    return this.inventoryService.create(dto, req.storeId);
  }

  @Get(':variantId')
  find(@Param('variantId') variantId: string, @Req() req) {
    return this.inventoryService.findByVariant(Number(variantId), req.storeId);
  }

  @Patch(':variantId')
  @UseGuards(CatalogManagerGuard)
  update(
    @Param('variantId') variantId: string,
    @Body('quantity') quantity: number,
    @Req() req,
  ) {
    return this.inventoryService.updateStock(
      Number(variantId),
      quantity,
      req.storeId,
    );
  }
}
