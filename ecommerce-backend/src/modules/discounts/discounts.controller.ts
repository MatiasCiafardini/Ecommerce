import { Controller, Post, Body, Get, Req, UseGuards, Patch, Param } from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
import { PreviewDiscountDto } from './dto/preview-discount.dto';
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

  @UseGuards(AdminAuthGuard)
  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() dto: CreateDiscountDto) {
    return this.discountsService.update(req.storeId, Number(id), dto);
  }

  @UseGuards(AdminAuthGuard)
  @Post(':id/cancel')
  cancel(@Req() req, @Param('id') id: string) {
    return this.discountsService.cancel(req.storeId, Number(id));
  }

  @Post('apply')
  applyCoupon(@Req() req, @Body() dto: ApplyCouponDto) {
    return this.discountsService.applyCoupon(req.storeId, dto.code, 0);
  }

  @Post('preview')
  preview(@Req() req, @Body() dto: PreviewDiscountDto) {
    return this.discountsService.previewDiscount(req.storeId, dto);
  }
}
