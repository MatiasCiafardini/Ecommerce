import { Controller, Post, Body, Get, Param, Patch, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
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
    return this.inventoryService.create(dto, req.storeId, req.user);
  }

  @Get('movements')
  listMovements(@Req() req, @Query() query: Record<string, string | undefined>) {
    return this.inventoryService.listMovements(req.storeId, query);
  }

  @Get('analytics')
  analytics(@Req() req, @Query() query: Record<string, string | undefined>) {
    return this.inventoryService.getAnalytics(req.storeId, query);
  }

  @Get('analytics/export.csv')
  async exportAnalytics(
    @Req() req,
    @Query() query: Record<string, string | undefined>,
    @Res() res: Response,
  ) {
    const csv = await this.inventoryService.getAnalyticsCsv(req.storeId, query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="inventario-analitica.csv"');
    res.send(`\uFEFF${csv}`);
  }

  @Get(':variantId')
  find(@Param('variantId') variantId: string, @Req() req) {
    return this.inventoryService.findByVariant(Number(variantId), req.storeId);
  }

  @Patch(':variantId')
  @UseGuards(CatalogManagerGuard)
  update(
    @Param('variantId') variantId: string,
    @Body() body: { quantity: number; reason?: string },
    @Req() req,
  ) {
    return this.inventoryService.updateStock(Number(variantId), body.quantity, req.storeId, req.user, body.reason);
  }
}
