import { Controller, Post, Body, Req } from '@nestjs/common';
import { Request } from 'express';

import { ShippingService } from './shipping.service';
import { GetShippingOptionsDto } from './dto/get-shipping-options.dto';

@Controller('store/shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post('options')
  async getOptions(
    @Req() req: Request & { storeId: number },
    @Body() dto: GetShippingOptionsDto,
  ) {
    return this.shippingService.getOptions(
      req.storeId,
      dto.cartId,
      dto.postalCode,
    );
  }
}
