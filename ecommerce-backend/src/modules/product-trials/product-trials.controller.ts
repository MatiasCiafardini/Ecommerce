import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { CreateProductTrialDto } from './dto/create-product-trial.dto';
import { ResolveProductTrialDto } from './dto/resolve-product-trial.dto';
import { ProductTrialsService } from './product-trials.service';

@UseGuards(AdminAuthGuard)
@Controller('current-accounts/:accountId/product-trials')
export class ProductTrialsController {
  constructor(private readonly productTrialsService: ProductTrialsService) {}

  @Get()
  findByAccount(@Req() req, @Param('accountId') accountId: string) {
    return this.productTrialsService.findByAccount(req.storeId, Number(accountId));
  }

  @Post()
  create(@Req() req, @Param('accountId') accountId: string, @Body() dto: CreateProductTrialDto) {
    return this.productTrialsService.create(req.storeId, Number(accountId), req.user?.sub, dto);
  }

  @Post('return')
  returnItems(@Req() req, @Param('accountId') accountId: string, @Body() dto: ResolveProductTrialDto) {
    return this.productTrialsService.returnItems(req.storeId, Number(accountId), req.user?.sub, dto.itemIds);
  }
}

@UseGuards(AdminAuthGuard)
@Controller('product-trials')
export class ProductTrialsOverviewController {
  constructor(private readonly productTrialsService: ProductTrialsService) {}

  @Get('pending')
  findPending(@Req() req, @Query('storeLocationId') storeLocationId?: string) {
    return this.productTrialsService.findPending(
      req.storeId,
      storeLocationId ? Number(storeLocationId) : undefined,
    );
  }
}
