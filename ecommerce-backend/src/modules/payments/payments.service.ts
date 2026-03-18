import { Injectable, NotFoundException } from '@nestjs/common';

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

  async createPayment(storeId: number, orderId: number, dto: CreatePaymentDto) {
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

    /**
     * =========================
     * MOCK PAYMENT (development)
     * =========================
     */
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

    /**
     * =========================
     * SI EL PAGO ESTÁ APROBADO
     * =========================
     */
    if (mpPayment.status === 'approved') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.paid,
        },
      });

      const existingShipment = await this.prisma.shipment.findUnique({
        where: {
          orderId: order.id,
        },
      });

      if (!existingShipment) {
        await this.fulfillmentService.createShipment(order.storeId, {
          orderId: order.id,
          provider: order.shippingProvider || 'manual',
          method: order.shippingMethod || 'standard',
          shippingAddress: 'Address not provided',
          postalCode: '0000',
        });
      }
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

    /**
     * =========================
     * PAYMENT APPROVED
     * =========================
     */
    if (mpPayment.status === 'approved') {
      const order = await this.prisma.order.findUnique({
        where: { id: payment.orderId },
        include: {
          shipment: true,
        },
      });

      if (!order) {
        return { received: true };
      }

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.paid,
        },
      });

      if (!order.shipment) {
        await this.fulfillmentService.createShipment(order.storeId, {
          orderId: order.id,
          provider: order.shippingProvider || 'manual',
          method: order.shippingMethod || 'standard',
          shippingAddress: 'Address not provided',
          postalCode: '0000',
        });
      }
    }

    /**
     * =========================
     * PAYMENT FAILED
     * =========================
     */
    if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') {
      const order = await this.prisma.order.findUnique({
        where: { id: payment.orderId },
      });

      if (!order) {
        return { received: true };
      }

      const orderItems = await this.prisma.orderItem.findMany({
        where: {
          orderId: payment.orderId,
        },
      });

      for (const item of orderItems) {
        await this.inventoryLockService.releaseStock(
          order.storeId,
          item.variantId,
          item.quantity,
        );
      }

      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.cancelled,
        },
      });
    }

    return { received: true };
  }
}
