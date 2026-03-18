import { Injectable } from '@nestjs/common';
import { MercadoPagoConfig, Payment } from 'mercadopago';

@Injectable()
export class MercadoPagoProvider {
  private client: MercadoPagoConfig;
  private accessToken: string;

  constructor() {
    this.accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN!;
    this.client = new MercadoPagoConfig({
      accessToken: this.accessToken,
    });
  }

  async createPayment(data: any) {
    const payment = new Payment(this.client);

    const result = await payment.create({
      body: {
        transaction_amount: data.amount,
        token: data.token,
        description: data.description,
        installments: data.installments,
        payment_method_id: data.paymentMethodId,
        issuer_id: data.issuerId,
        payer: {
          email: data.email,
        },
      },
    });

    return result;
  }

  async getPayment(paymentId: string) {
    const payment = new Payment(this.client);

    const result = await payment.get({
      id: paymentId,
    });

    return result;
  }

  /**
   * Refund payment
   */
  async refundPayment(paymentId: string, amount?: number) {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}/refunds`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(amount ? { amount } : {}),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MercadoPago refund failed: ${error}`);
    }

    return response.json();
  }
}
