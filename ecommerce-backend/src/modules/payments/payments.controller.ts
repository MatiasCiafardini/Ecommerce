import { Controller, Post, Param, Body, Req } from '@nestjs/common';

import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

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
    );
  }

  @Post('payments/webhook')
  webhook(@Body() body: any) {
    return this.paymentsService.handleWebhook(body);
  }
}
