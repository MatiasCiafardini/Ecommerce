import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
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

  @Get(':id')
  findOneMine(@Param('id') id: string, @Req() req) {
    return this.ordersService.findOneMine(Number(id), req.storeId, req.user.sub);
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
