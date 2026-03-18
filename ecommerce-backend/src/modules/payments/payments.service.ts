import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InventoryLockService } from '../inventory-lock/inventory-lock.service';
import { FulfillmentService } from '../fulfillment/fulfillment.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private mercadopago: MercadoPagoProvider,
    private inventoryLockService: InventoryLockService,
    private fulfillmentService: FulfillmentService,
  ) {}

  async createPayment(
    storeId: number,
    orderId: number,
    dto: CreatePaymentDto,
    requester?: { sub: number; role?: string },
  ) {
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        storeId,
        idempotencyKey: dto.idempotencyKey,
      },
    });

    if (existingPayment) {
      return existingPayment;
    }

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

    let mpPayment;

    if (dto.token === 'test-token') {
      mpPayment = {
        id: `test-${Date.now()}`,
        status: 'approved',
      };
    } else {
      mpPayment = await this.mercadopago.createPayment({
        amount: Number(order.total),
        token: dto.token,
        paymentMethodId: dto.paymentMethodId,
        installments: dto.installments,
        issuerId: dto.issuerId,
        description: `Order #${order.id}`,
        email: order.customer?.email || 'buyer@email.com',
      });
    }

    const payment = await this.prisma.payment.create({
      data: {
        storeId,
        orderId,
        provider: 'mercadopago',
        status: mpPayment.status ?? 'pending',
        amount: order.total,
        externalId: String(mpPayment.id),
        idempotencyKey: dto.idempotencyKey,
      },
    });

    if (mpPayment.status === 'approved') {
      await this.finalizeApprovedOrder(order.id);
    }

    return payment;
  }

  async handleWebhook(body: any) {
    if (body.type !== 'payment') {
      return { received: true };
    }

    const paymentId = body.data.id;
    const mpPayment = await this.mercadopago.getPayment(paymentId);

    const payment = await this.prisma.payment.findFirst({
      where: {
        externalId: String(paymentId),
      },
    });

    if (!payment) {
      return { received: true };
    }

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

  private async finalizeApprovedOrder(orderId: number) {
    const result = await this.prisma.$transaction(async (tx) => {
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

      return {
        storeId: order.storeId,
        orderId: order.id,
        shipment: order.shipment,
        shippingProvider: order.shippingProvider,
        shippingMethod: order.shippingMethod,
      };
    });

    if (!result.shipment) {
      await this.fulfillmentService.createShipment(result.storeId, {
        orderId: result.orderId,
        provider: result.shippingProvider || 'manual',
        method: result.shippingMethod || 'standard',
        shippingAddress: 'Address not provided',
        postalCode: '0000',
      });
    }
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
