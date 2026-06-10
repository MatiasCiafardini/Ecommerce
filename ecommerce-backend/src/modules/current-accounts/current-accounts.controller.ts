import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { CurrentAccountsService } from './current-accounts.service';
import { RegisterCurrentAccountPaymentDto } from './dto/register-current-account-payment.dto';

@UseGuards(AdminAuthGuard)
@Controller('current-accounts')
export class CurrentAccountsController {
  constructor(private readonly currentAccountsService: CurrentAccountsService) {}

  @Get()
  findAll(
    @Req() req,
    @Query('status') status?: 'debt' | 'paid' | 'all',
    @Query('search') search?: string,
  ) {
    return this.currentAccountsService.findAll(
      req.storeId,
      status === 'paid' || status === 'all' ? status : 'debt',
      search ?? '',
    );
  }

  @Get('customers/:customerId')
  findByCustomer(@Req() req, @Param('customerId') customerId: string) {
    return this.currentAccountsService.findByCustomer(
      req.storeId,
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
}
