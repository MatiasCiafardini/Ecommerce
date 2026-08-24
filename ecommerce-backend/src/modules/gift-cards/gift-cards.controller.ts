import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { AdjustGiftCardDto } from './dto/adjust-gift-card.dto';
import { CancelGiftCardDto } from './dto/cancel-gift-card.dto';
import { GiftCardQueryDto } from './dto/gift-card-query.dto';
import { GiftCardsService } from './gift-cards.service';

@ApiSecurity('x-store-id')
@ApiBearerAuth('jwt')
@ApiTags('Gift Cards')
@UseGuards(AdminAuthGuard)
@Controller('gift-cards')
export class GiftCardsController {
  constructor(private readonly giftCards: GiftCardsService) {}

  @Get()
  list(@Req() req, @Query() query: GiftCardQueryDto) {
    return this.giftCards.list(req.storeId, query);
  }

  @Get('stats')
  stats(@Req() req) {
    return this.giftCards.stats(req.storeId);
  }

  @Get('lookup')
  lookup(@Req() req, @Query('code') code: string) {
    return this.giftCards.lookup(req.storeId, code ?? '');
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.giftCards.findOne(req.storeId, Number(id));
  }

  @Patch(':id/cancel')
  cancel(@Req() req, @Param('id') id: string, @Body() dto: CancelGiftCardDto) {
    return this.giftCards.cancel(req.storeId, Number(id), req.user?.sub, dto.reason);
  }

  @Patch(':id/adjust')
  adjust(@Req() req, @Param('id') id: string, @Body() dto: AdjustGiftCardDto) {
    return this.giftCards.adjust(req.storeId, Number(id), req.user?.sub, dto);
  }
}
