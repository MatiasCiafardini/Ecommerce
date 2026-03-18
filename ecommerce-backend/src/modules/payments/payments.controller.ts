import { Controller, Post, Param, Body, Req, UseGuards } from '@nestjs/common';

import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('store/payments/:orderId')
  createPayment(
    @Req() req,
    @Param('orderId') orderId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(
      req.storeId,
      Number(orderId),
      dto,
      req.user,
    );
  }

  @Post('payments/webhook')
  webhook(@Body() body: any) {
    return this.paymentsService.handleWebhook(body);
  }
}
