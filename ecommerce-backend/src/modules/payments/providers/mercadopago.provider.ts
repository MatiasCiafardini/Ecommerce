import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class MercadoPagoProvider {
  constructor(private readonly prisma: PrismaService) {}

  private async getAccessToken(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        mercadoPagoAccessToken: true,
      },
    });
    const accessToken = store?.mercadoPagoAccessToken?.trim();

    if (!accessToken) {
      throw new ServiceUnavailableException(
        'Mercado Pago is not configured for this store. Set mercadoPagoAccessToken before enabling card payments.',
      );
    }

    return accessToken;
  }

  async getPublicConfig(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        mercadoPagoPublicKey: true,
      },
    });
    const publicKey = store?.mercadoPagoPublicKey?.trim() ?? '';

    return {
      enabled: Boolean(publicKey),
      publicKey: publicKey || null,
    };
  }

  private async createClient(storeId: number) {
    return new MercadoPagoConfig({
      accessToken: await this.getAccessToken(storeId),
    });
  }

  async createPayment(data: any) {
    const payment = new Payment(await this.createClient(data.storeId));

    const result = await payment.create({
      body: {
        transaction_amount: data.amount,
        token: data.token,
        description: data.description,
        installments: data.installments,
        payment_method_id: data.paymentMethodId,
        issuer_id: data.issuerId,
        external_reference: data.externalReference,
        payer: {
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
        },
      },
      requestOptions: data.idempotencyKey
        ? {
            idempotencyKey: data.idempotencyKey,
          }
        : undefined,
    });

    return result;
  }

  async getPayment(storeId: number, paymentId: string) {
    const payment = new Payment(await this.createClient(storeId));

    const result = await payment.get({
      id: paymentId,
    });

    return result;
  }

  /**
   * Refund payment
   */
  async refundPayment(storeId: number, paymentId: string, amount?: number) {
    const accessToken = await this.getAccessToken(storeId);
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}/refunds`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
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
