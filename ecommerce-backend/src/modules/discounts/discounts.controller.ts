import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

@Controller('discounts')
export class DiscountsController {
  constructor(private discountsService: DiscountsService) {}

  @UseGuards(AdminAuthGuard)
  @Post()
  create(@Req() req, @Body() dto: CreateDiscountDto) {
    return this.discountsService.create(req.storeId, dto);
  }

  @UseGuards(AdminAuthGuard)
  @Get()
  findAll(@Req() req) {
    return this.discountsService.findAll(req.storeId);
  }

  @Post('apply')
  applyCoupon(@Req() req, @Body() dto: ApplyCouponDto) {
    return this.discountsService.applyCoupon(req.storeId, dto.code, 0);
  }
}
