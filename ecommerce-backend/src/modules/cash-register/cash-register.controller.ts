import { Body, Controller, Get, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { CashRegisterService } from './cash-register.service';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { UpdateCashRegisterConfigDto } from './dto/update-cash-register-config.dto';

@UseGuards(AdminAuthGuard)
@Controller('cash-register')
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Get('config')
  getConfig(@Req() req) {
    return this.cashRegisterService.getConfig(req.storeId);
  }

  @Put('config')
  updateConfig(@Req() req, @Body() dto: UpdateCashRegisterConfigDto) {
    return this.cashRegisterService.updateConfig(req.storeId, dto);
  }

  @Get('current')
  getCurrent(@Req() req) {
    return this.cashRegisterService.getCurrent(req.storeId, req.user?.sub);
  }

  @Post('open')
  open(@Req() req, @Body() dto: OpenCashRegisterDto) {
    return this.cashRegisterService.openManual(req.storeId, req.user?.sub, dto);
  }

  @Post('close')
  close(@Req() req, @Body() dto: CloseCashRegisterDto) {
    return this.cashRegisterService.closeManual(req.storeId, req.user?.sub, dto);
  }

  @Get('history')
  history(@Req() req) {
    return this.cashRegisterService.getHistory(req.storeId, req.user?.sub);
  }

  @Get('range-summary')
  rangeSummary(
    @Req() req,
    @Query('start') start: string | undefined,
    @Query('end') end: string | undefined,
  ) {
    return this.cashRegisterService.getRangeSummary(
      req.storeId,
      req.user?.sub,
      start,
      end,
    );
  }

  @Get('closure.pdf')
  async closurePdf(
    @Req() req,
    @Query('sessionId') sessionId: string | undefined,
    @Res() res: Response,
  ) {
    const document = await this.cashRegisterService.getClosurePdf(
      req.storeId,
      req.user?.sub,
      sessionId ? Number(sessionId) : undefined,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    return res.send(document.pdf);
  }
}
