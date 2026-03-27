import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ReviewPaymentDto } from './dto/review-payment.dto';
import { InventoryLockService } from '../inventory-lock/inventory-lock.service';

type Requester = { sub: number; role?: string };
type UploadedTransferProof = { filename: string; originalname: string };

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
        proofUrl: `/uploads/${file.filename}`,
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

    return this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'rejected',
        notes: dto.notes?.trim()
          ? [payment.notes, dto.notes.trim()].filter(Boolean).join('\n')
          : payment.notes,
        reviewedAt: new Date(),
      },
    });
  }

  async handleWebhook(body: any) {
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
}
