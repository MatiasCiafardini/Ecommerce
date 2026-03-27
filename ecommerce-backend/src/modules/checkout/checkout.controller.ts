import { Controller, Post, Param, Req, Body, UseGuards } from '@nestjs/common';

import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('store/checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post(':cartId')
  checkout(
    @Req() req,
    @Param('cartId') cartId: string,
    @Body() dto: CheckoutDto,
  ) {
    return this.checkoutService.checkout(req.storeId, Number(cartId), dto, req.user.sub);
  }
}
