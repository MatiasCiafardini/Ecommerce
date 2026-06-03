import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { ShippingService } from './shipping.service';
import { GetShippingOptionsDto } from './dto/get-shipping-options.dto';
import { GetShippingAgenciesDto } from './dto/get-shipping-agencies.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('store/shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('methods')
  async getMethods(@Req() req: Request & { storeId: number }) {
    return this.shippingService.getStoreMethods(req.storeId);
  }

  @Post('options')
  async getOptions(
    @Req() req: Request & { storeId: number },
    @Body() dto: GetShippingOptionsDto,
  ) {
    return this.shippingService.getOptions(
      req.storeId,
      dto.cartId,
      (req as any).user.sub,
      dto.postalCode,
      {
        state: dto.state,
        city: dto.city,
        country: dto.country,
        deliveryMode: dto.deliveryMode,
      },
    );
  }

  @Post('agencies')
  async getAgencies(
    @Req() req: Request & { storeId: number },
    @Body() dto: GetShippingAgenciesDto,
  ) {
    return this.shippingService.getAgencies(req.storeId, (req as any).user.sub, dto);
  }
}
