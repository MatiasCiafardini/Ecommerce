import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class MercadoPagoProvider {
  constructor(private readonly prisma: PrismaService) {}

  private maskSecret(value?: string | null) {
    const trimmed = value?.trim() ?? '';

    if (!trimmed) {
      return null;
    }

    if (trimmed.length <= 8) {
      return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
    }

    return `${trimmed.slice(0, 4)}***${trimmed.slice(-4)}`;
  }

  private async getStoredConfig(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        mercadoPagoPublicKey: true,
        mercadoPagoAccessToken: true,
        mercadoPagoWebhookSecret: true,
      },
    });

    return {
      publicKey: store?.mercadoPagoPublicKey?.trim() || '',
      accessToken: store?.mercadoPagoAccessToken?.trim() || '',
      webhookSecret: store?.mercadoPagoWebhookSecret?.trim() || '',
    };
  }

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

  async getAdminConfig(storeId: number) {
    const config = await this.getStoredConfig(storeId);

    return {
      publicKey: config.publicKey,
      accessTokenConfigured: Boolean(config.accessToken),
      webhookSecretConfigured: Boolean(config.webhookSecret),
      accessTokenPreview: this.maskSecret(config.accessToken),
      webhookSecretPreview: this.maskSecret(config.webhookSecret),
    };
  }

  async updateAdminConfig(
    storeId: number,
    input: {
      publicKey?: string | null;
      accessToken?: string | null;
      webhookSecret?: string | null;
    },
  ) {
    const data: {
      mercadoPagoPublicKey?: string | null;
      mercadoPagoAccessToken?: string | null;
      mercadoPagoWebhookSecret?: string | null;
    } = {};

    if (input.publicKey !== undefined) {
      data.mercadoPagoPublicKey = input.publicKey?.trim() || null;
    }

    if (input.accessToken !== undefined) {
      data.mercadoPagoAccessToken = input.accessToken?.trim() || null;
    }

    if (input.webhookSecret !== undefined) {
      data.mercadoPagoWebhookSecret = input.webhookSecret?.trim() || null;
    }

    await this.prisma.store.update({
      where: { id: storeId },
      data,
    });

    return this.getAdminConfig(storeId);
  }

  async testConfiguration(storeId: number) {
    const config = await this.getStoredConfig(storeId);
    const checks = {
      publicKey: Boolean(config.publicKey),
      accessToken: Boolean(config.accessToken),
      webhookSecret: Boolean(config.webhookSecret),
    };

    if (!checks.accessToken) {
      return {
        ok: false,
        checks,
        message:
          'Falta el access token de Mercado Pago para poder validar la integracion.',
      };
    }

    const response = await fetch('https://api.mercadopago.com/users/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return {
        ok: false,
        checks,
        message:
          'Mercado Pago rechazo las credenciales cargadas para esta tienda.',
        details: errorText || null,
      };
    }

    const payload = (await response.json().catch(() => null)) as
      | {
          id?: number | string;
          nickname?: string;
          email?: string;
        }
      | null;

    return {
      ok: true,
      checks,
      message: 'La integracion con Mercado Pago respondio correctamente.',
      account: payload
        ? {
            id: payload.id ?? null,
            nickname: payload.nickname ?? null,
            email: payload.email ?? null,
          }
        : null,
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
