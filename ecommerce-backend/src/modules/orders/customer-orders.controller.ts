import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { RequestCancellationDto } from './dto/request-cancellation.dto';

@ApiSecurity('x-store-id')
@ApiBearerAuth('jwt')
@ApiTags('Customer Orders')
@UseGuards(JwtAuthGuard)
@Controller('customers/me/orders')
export class CustomerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findMine(@Req() req) {
    return this.ordersService.findMine(req.storeId, req.user.sub);
  }

  @Get('notifications')
  getNotifications(@Req() req) {
    return this.ordersService.getCustomerNotifications(req.storeId, req.user.sub);
  }

  @Get(':id')
  findOneMine(@Param('id') id: string, @Req() req) {
    return this.ordersService.findOneMine(Number(id), req.storeId, req.user.sub);
  }

  @Get(':id/receipt.pdf')
  async downloadReceiptPdf(
    @Param('id') id: string,
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const document = await this.ordersService.getCustomerReceiptPdf(
      Number(id),
      req.storeId,
      req.user.sub,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    return document.pdf;
  }

  @Post(':id/cancel')
  cancelMine(@Param('id') id: string, @Req() req) {
    return this.ordersService.cancelMine(Number(id), req.storeId, req.user.sub);
  }

  @Post(':id/cancellation-request')
  requestCancellation(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: RequestCancellationDto,
  ) {
    return this.ordersService.requestCancellation(
      Number(id),
      req.storeId,
      req.user.sub,
      dto,
    );
  }
}
