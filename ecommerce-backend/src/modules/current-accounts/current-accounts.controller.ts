import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { CurrentAccountsService } from './current-accounts.service';
import { AdjustCurrentAccountDto } from './dto/adjust-current-account.dto';
import { CreateCurrentAccountDto } from './dto/create-current-account.dto';
import { RegisterCurrentAccountPaymentDto } from './dto/register-current-account-payment.dto';
import { UpdateCurrentAccountDto } from './dto/update-current-account.dto';

@UseGuards(AdminAuthGuard)
@Controller('current-accounts')
export class CurrentAccountsController {
  constructor(private readonly currentAccountsService: CurrentAccountsService) {}

  @Get()
  findAll(
    @Req() req,
    @Query('status') status?: 'debt' | 'credit' | 'paid' | 'all',
    @Query('search') search?: string,
  ) {
    return this.currentAccountsService.findAll(
      req.storeId,
      req.user?.sub,
      status === 'paid' || status === 'all' || status === 'credit' ? status : 'debt',
      search ?? '',
    );
  }

  @Get('inactive/by-phone')
  findInactiveByPhone(@Req() req, @Query('phone') phone?: string) {
    return this.currentAccountsService.findInactiveByPhone(
      req.storeId,
      phone ?? '',
    );
  }

  @Post()
  create(@Req() req, @Body() dto: CreateCurrentAccountDto) {
    return this.currentAccountsService.create(req.storeId, req.user?.sub, dto);
  }

  @Get('payments/:movementId/receipt.pdf')
  async downloadPaymentReceipt(
    @Req() req,
    @Param('movementId') movementId: string,
    @Res() res: Response,
  ) {
    const document = await this.currentAccountsService.getPaymentReceiptPdf(
      req.storeId,
      Number(movementId),
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${document.filename}"`);
    return res.send(document.pdf);
  }

  @Get('customers/:customerId')
  findByCustomer(@Req() req, @Param('customerId') customerId: string) {
    return this.currentAccountsService.findByCustomer(
      req.storeId,
      req.user?.sub,
      Number(customerId),
    );
  }

  @Post('customers/:customerId/payments')
  registerPayment(
    @Req() req,
    @Param('customerId') customerId: string,
    @Body() dto: RegisterCurrentAccountPaymentDto,
  ) {
    return this.currentAccountsService.registerPayment(
      req.storeId,
      Number(customerId),
      req.user?.sub,
      dto,
    );
  }

  @Patch('customers/:customerId')
  updateCustomer(
    @Req() req,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCurrentAccountDto,
  ) {
    return this.currentAccountsService.updateCustomer(
      req.storeId,
      Number(customerId),
      req.user?.sub,
      dto,
    );
  }

  @Patch('customers/:customerId/reactivate')
  reactivate(
    @Req() req,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCurrentAccountDto,
  ) {
    return this.currentAccountsService.reactivate(
      req.storeId,
      Number(customerId),
      req.user?.sub,
      dto,
    );
  }

  @Patch('customers/:customerId/balance')
  adjustBalance(
    @Req() req,
    @Param('customerId') customerId: string,
    @Body() dto: AdjustCurrentAccountDto,
  ) {
    return this.currentAccountsService.adjustBalance(
      req.storeId,
      Number(customerId),
      req.user?.sub,
      dto,
    );
  }

  @Delete('customers/:customerId')
  deactivate(@Req() req, @Param('customerId') customerId: string) {
    return this.currentAccountsService.deactivate(
      req.storeId,
      Number(customerId),
    );
  }
}
