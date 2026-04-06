import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { access } from 'fs/promises';
import { basename, extname, join } from 'path';
import { OrderStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ReviewPaymentDto } from './dto/review-payment.dto';
import { InventoryLockService } from '../inventory-lock/inventory-lock.service';
import { runtimeConfig } from '../../config/runtime-config';
import { privateUploadsDir, uploadsDir } from '../../common/uploads';

type Requester = { sub: number; role?: string };
type UploadedTransferProof = { filename: string; originalname: string };
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'OWNER', 'ADMIN', 'STAFF']);

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private mercadopago: MercadoPagoProvider,
    private inventoryLockService: InventoryLockService,
  ) {}

  async createPayment(
    storeId: number,
    orderId: number,
    dto: CreatePaymentDto,
    requester?: Requester,
  ) {
    const idempotencyKey = this.normalizeIdempotencyKey(dto.idempotencyKey);
    const provider = dto.provider?.trim().toLowerCase() || 'mercadopago';

    if (provider === 'bank_transfer') {
      throw new BadRequestException(
        'Use the bank transfer endpoint to attach the payment proof',
      );
    }

    const existingPayment = await this.findExistingPayment(storeId, idempotencyKey);
    if (existingPayment) {
      return existingPayment;
    }

    const order = await this.getOrderForPayment(storeId, orderId, requester);

    let mpPayment;

    if (!dto.token || dto.token === 'test-token') {
      throw new BadRequestException(
        'A valid Mercado Pago card token is required to process the payment',
      );
    }

    mpPayment = await this.mercadopago.createPayment({
      storeId,
      amount: Number(order.total),
      token: dto.token,
      paymentMethodId: dto.paymentMethodId,
      installments: dto.installments ?? 1,
      issuerId: dto.issuerId,
      description: `Order #${order.id}`,
      email: this.ensureMercadoPagoEmail(order),
      firstName: order.shippingFirstNameSnapshot || undefined,
      lastName: order.shippingLastNameSnapshot || undefined,
      externalReference: `${order.storeId}-${order.id}`,
      idempotencyKey,
    });

    const payment = await this.prisma.payment.create({
      data: {
        storeId,
        orderId,
        provider: 'mercadopago',
        method: dto.method?.trim() || dto.paymentMethodId || 'card',
        status: mpPayment.status ?? 'pending',
        amount: order.total,
        externalId: String(mpPayment.id),
        reference: dto.reference?.trim() || null,
        notes: dto.notes?.trim() || null,
        idempotencyKey,
        metadata: {
          source: 'checkout',
          gateway: 'mercadopago',
          paymentMethodId: dto.paymentMethodId ?? null,
          installments: dto.installments ?? 1,
        },
      },
    });

    if (mpPayment.status === 'approved') {
      await this.finalizeApprovedOrder(order.id);
    }

    if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') {
      await this.cancelPendingOrder(order.id);
    }

    return payment;
  }

  async createBankTransferPayment(
    storeId: number,
    orderId: number,
    dto: CreatePaymentDto,
    file: UploadedTransferProof | undefined,
    requester?: Requester,
  ) {
    const idempotencyKey = this.normalizeIdempotencyKey(dto.idempotencyKey);
    const existingPayment = await this.findExistingPayment(storeId, idempotencyKey);
    if (existingPayment) {
      return existingPayment;
    }

    if (!file?.filename) {
      throw new BadRequestException(
        'Transfer proof is required for bank transfer payments',
      );
    }

    const order = await this.getOrderForPayment(storeId, orderId, requester);

    return this.prisma.payment.create({
      data: {
        storeId,
        orderId,
        provider: 'bank_transfer',
        method: dto.method?.trim() || 'bank_transfer',
        status: 'pending',
        amount: order.total,
        reference: dto.reference?.trim() || null,
        proofUrl: `/private-uploads/${file.filename}`,
        proofFilename: file.originalname,
        notes: dto.notes?.trim() || null,
        idempotencyKey,
        metadata: {
          source: 'checkout',
          channel: 'manual_transfer',
          uploadedAt: new Date().toISOString(),
        },
      },
    });
  }

  async getPaymentProofFile(
    storeId: number,
    paymentId: number,
    requester?: Requester,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        storeId,
      },
      include: {
        order: {
          select: {
            customerId: true,
          },
        },
      },
    });

    if (!payment?.proofUrl) {
      throw new NotFoundException('Payment proof not found');
    }

    const requesterRole = requester?.role?.trim() || 'CUSTOMER';
    const isAdmin = ADMIN_ROLES.has(requesterRole);

    if (!isAdmin && requester?.sub !== payment.order.customerId) {
      throw new ForbiddenException('You cannot access this payment proof');
    }

    const absolutePath = await this.resolvePaymentProofAbsolutePath(
      payment.proofUrl,
    );

    return {
      absolutePath,
      originalName:
        payment.proofFilename?.trim() ||
        `payment-proof-${payment.id}${extname(absolutePath)}`,
    };
  }

  async approvePayment(
    storeId: number,
    paymentId: number,
    dto: ReviewPaymentDto,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        storeId,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'approved',
        notes: dto.notes?.trim()
          ? [payment.notes, dto.notes.trim()].filter(Boolean).join('\n')
          : payment.notes,
        reviewedAt: new Date(),
      },
    });

    await this.finalizeApprovedOrder(payment.orderId);

    return updated;
  }

  async rejectPayment(
    storeId: number,
    paymentId: number,
    dto: ReviewPaymentDto,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        storeId,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'rejected',
        notes: dto.notes?.trim()
          ? [payment.notes, dto.notes.trim()].filter(Boolean).join('\n')
          : payment.notes,
        reviewedAt: new Date(),
      },
    });

    await this.cancelPendingOrder(payment.orderId);

    return updated;
  }

  async handleWebhook(
    body: any,
    headers?: Record<string, string | string[] | undefined>,
    query?: Record<string, string | string[] | undefined>,
  ) {
    if (body.type !== 'payment') {
      return { received: true };
    }

    if (!body?.data?.id) {
      throw new BadRequestException('Mercado Pago webhook payload is missing data.id');
    }

    const paymentId = body.data.id;
    const payment = await this.prisma.payment.findFirst({
      where: {
        externalId: String(paymentId),
      },
    });

    if (!payment) {
      return { received: true };
    }

    await this.verifyMercadoPagoWebhookSignature(
      payment.storeId,
      body,
      headers,
      query,
    );

    const mpPayment = await this.mercadopago.getPayment(
      payment.storeId,
      paymentId,
    );

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: mpPayment.status,
      },
    });

    if (mpPayment.status === 'approved') {
      await this.finalizeApprovedOrder(payment.orderId);
    }

    if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') {
      await this.cancelPendingOrder(payment.orderId);
    }

    return { received: true };
  }

  private normalizeIdempotencyKey(idempotencyKey?: string) {
    const normalizedKey = idempotencyKey?.trim();

    if (!normalizedKey) {
      throw new BadRequestException('idempotencyKey is required');
    }

    return normalizedKey;
  }

  private async findExistingPayment(storeId: number, idempotencyKey: string) {
    return this.prisma.payment.findFirst({
      where: {
        storeId,
        idempotencyKey,
      },
    });
  }

  private async resolvePaymentProofAbsolutePath(rawProofUrl: string) {
    const normalized = rawProofUrl.trim();
    const filename = basename(normalized);
    const candidates = normalized.startsWith('/uploads/')
      ? [uploadsDir, privateUploadsDir]
      : [privateUploadsDir, uploadsDir];

    for (const directory of candidates) {
      const absolutePath = join(directory, filename);

      try {
        await access(absolutePath);
        return absolutePath;
      } catch {
        continue;
      }
    }

    throw new NotFoundException('Payment proof file not found');
  }

  private async getOrderForPayment(
    storeId: number,
    orderId: number,
    requester?: Requester,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        storeId,
      },
      include: {
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!requester?.role || requester.role === 'CUSTOMER') {
      if (requester?.sub !== order.customerId) {
        throw new ForbiddenException('You cannot pay for this order');
      }
    }

    return order;
  }

  private ensureMercadoPagoEmail(order: {
    customer?: { email?: string | null } | null;
  }) {
    const email = order.customer?.email?.trim();

    if (!email) {
      throw new ServiceUnavailableException(
        'The customer email is required to process Mercado Pago payments',
      );
    }

    return email;
  }

  private async finalizeApprovedOrder(orderId: number) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          shipment: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== OrderStatus.paid) {
        for (const item of order.items) {
          await this.inventoryLockService.confirmStockTx(
            tx,
            order.storeId,
            item.variantId,
            item.quantity,
          );
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.paid,
          },
        });
      }
    });
  }

  private async cancelPendingOrder(orderId: number) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
        },
      });

      if (!order || order.status !== OrderStatus.pending) {
        return;
      }

      for (const item of order.items) {
        await this.inventoryLockService.releaseStockTx(
          tx,
          order.storeId,
          item.variantId,
          item.quantity,
        );
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.cancelled,
        },
      });
    });
  }

  private async verifyMercadoPagoWebhookSignature(
    storeId: number,
    body: any,
    headers?: Record<string, string | string[] | undefined>,
    query?: Record<string, string | string[] | undefined>,
  ) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        mercadoPagoWebhookSecret: true,
      },
    });
    const webhookSecret =
      store?.mercadoPagoWebhookSecret?.trim() ||
      runtimeConfig.mercadoPagoWebhookSecret?.trim();

    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        'Mercado Pago webhook secret is not configured',
      );
    }

    const signatureHeader = this.readHeaderValue(headers, 'x-signature');
    const requestIdHeader = this.readHeaderValue(headers, 'x-request-id');
    const dataId =
      this.readQueryValue(query, 'data.id') ??
      String(body?.data?.id ?? '').trim();

    if (!signatureHeader || !requestIdHeader || !dataId) {
      throw new BadRequestException(
        'Mercado Pago webhook signature headers are missing',
      );
    }

    const signatureParts = new Map(
      signatureHeader.split(',').map((part) => {
        const [key, ...rest] = part.trim().split('=');
        return [key?.trim().toLowerCase(), rest.join('=').trim()];
      }),
    );

    const ts = signatureParts.get('ts');
    const receivedV1 = signatureParts.get('v1');

    if (!ts || !receivedV1) {
      throw new BadRequestException(
        'Mercado Pago webhook signature is malformed',
      );
    }

    const manifest = `id:${dataId};request-id:${requestIdHeader};ts:${ts};`;
    const expectedV1 = crypto
      .createHmac('sha256', webhookSecret)
      .update(manifest)
      .digest('hex');

    const receivedBuffer = Buffer.from(receivedV1, 'hex');
    const expectedBuffer = Buffer.from(expectedV1, 'hex');

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      throw new BadRequestException(
        'Mercado Pago webhook signature is invalid',
      );
    }
  }

  private readHeaderValue(
    headers: Record<string, string | string[] | undefined> | undefined,
    name: string,
  ) {
    const value = headers?.[name] ?? headers?.[name.toLowerCase()];

    if (Array.isArray(value)) {
      return value[0]?.trim();
    }

    return value?.trim();
  }

  private readQueryValue(
    query: Record<string, string | string[] | undefined> | undefined,
    name: string,
  ) {
    const value = query?.[name];

    if (Array.isArray(value)) {
      return value[0]?.trim();
    }

    return value?.trim();
  }
}
