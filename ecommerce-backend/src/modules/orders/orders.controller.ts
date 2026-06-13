import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  Req,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateManualSaleDto } from './dto/create-manual-sale.dto';
import { UpdateManualSaleDto } from './dto/update-manual-sale.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ReviewCancellationRequestDto } from './dto/review-cancellation-request.dto';
import { ExportAccountingDto } from './dto/export-accounting.dto';
import { ApiTags, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import type { Response } from 'express';

@ApiSecurity('x-store-id')
@ApiBearerAuth('jwt')
@ApiTags('Orders')
@UseGuards(AdminAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto, @Req() req) {
    return this.ordersService.create(dto, req.storeId);
  }

  @Post('manual')
  createManual(@Body() dto: CreateManualSaleDto, @Req() req) {
    return this.ordersService.createManualSale(dto, req.storeId, req.user?.sub);
  }

  @Patch('manual/:id/cancel')
  cancelManual(@Param('id') id: string, @Req() req) {
    return this.ordersService.cancelManualSale(Number(id), req.storeId, req.user?.sub);
  }

  @Patch('manual/:id')
  updateManual(
    @Param('id') id: string,
    @Body() dto: UpdateManualSaleDto,
    @Req() req,
  ) {
    return this.ordersService.updateManualSale(Number(id), dto, req.storeId, req.user?.sub);
  }

  @Get()
  findAll(@Req() req) {
    return this.ordersService.findAll(req.storeId);
  }

  @Get('notifications')
  getNotifications(@Req() req) {
    return this.ordersService.getAdminNotifications(req.storeId);
  }

  @Get('manual/list')
  findManualSales(@Req() req, @Query('storeLocationId') storeLocationId?: string) {
    return this.ordersService.findManualSales(
      req.storeId,
      req.user?.sub,
      parseOptionalId(storeLocationId),
    );
  }

  @Get('accounting/export')
  async exportAccounting(
    @Query() query: ExportAccountingDto,
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const exported = await this.ordersService.exportAccountingCsv(
      req.storeId,
      query,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exported.filename}"`,
    );
    return exported.csv;
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.ordersService.findOne(Number(id), req.storeId);
  }

  @Get(':id/receipt.pdf')
  async downloadReceiptPdf(
    @Param('id') id: string,
    @Req() req,
    @Res() res: Response,
  ) {
    const document = await this.ordersService.getAdminReceiptPdf(Number(id), req.storeId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${document.filename}"`);
    return res.send(document.pdf);
  }

  @Get('cancellation-requests/list')
  findCancellationRequests(@Req() req) {
    return this.ordersService.findCancellationRequests(req.storeId);
  }

  /**
   * Update order lifecycle status
   */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req,
  ) {
    return this.ordersService.updateStatus(Number(id), dto.status, req.storeId);
  }

  @Post('cancellation-requests/:id/review')
  reviewCancellationRequest(
    @Param('id') id: string,
    @Body() dto: ReviewCancellationRequestDto,
    @Req() req,
  ) {
    return this.ordersService.reviewCancellationRequest(
      Number(id),
      req.storeId,
      dto,
    );
  }
}

function parseOptionalId(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
