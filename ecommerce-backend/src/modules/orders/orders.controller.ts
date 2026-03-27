import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateManualSaleDto } from './dto/create-manual-sale.dto';
import { UpdateManualSaleDto } from './dto/update-manual-sale.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ReviewCancellationRequestDto } from './dto/review-cancellation-request.dto';
import { ApiTags, ApiSecurity, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

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
    return this.ordersService.createManualSale(dto, req.storeId);
  }

  @Patch('manual/:id')
  updateManual(
    @Param('id') id: string,
    @Body() dto: UpdateManualSaleDto,
    @Req() req,
  ) {
    return this.ordersService.updateManualSale(Number(id), dto, req.storeId);
  }

  @Get()
  findAll(@Req() req) {
    return this.ordersService.findAll(req.storeId);
  }

  @Get('manual/list')
  findManualSales(@Req() req) {
    return this.ordersService.findManualSales(req.storeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.ordersService.findOne(Number(id), req.storeId);
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
