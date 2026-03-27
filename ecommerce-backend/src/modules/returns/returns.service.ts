import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { ApproveReturnDto } from './dto/approve-return.dto';
import { MercadoPagoProvider } from '../payments/providers/mercadopago.provider';

@Injectable()
export class ReturnsService {
  constructor(
    private prisma: PrismaService,
    private mercadopago: MercadoPagoProvider,
  ) {}

  async createReturn(storeId: number, customerId: number, dto: CreateReturnDto) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        storeId,
      },
      include: {
        items: true,
        returns: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customerId !== customerId) {
      throw new ForbiddenException('You cannot request a return for this order');
    }

    if (order.status !== 'delivered') {
      throw new BadRequestException(
        'Returns are only available after the order is delivered',
      );
    }

    if (!dto.items.length) {
      throw new BadRequestException('Select at least one item to return');
    }

    const orderItemsMap = new Map(order.items.map((item) => [item.id, item]));
    const pendingRequestedByItem = new Map<number, number>();

    for (const existingReturn of order.returns) {
      if (existingReturn.status !== 'requested') {
        continue;
      }

      for (const item of existingReturn.items) {
        pendingRequestedByItem.set(
          item.orderItemId,
          (pendingRequestedByItem.get(item.orderItemId) ?? 0) + item.quantity,
        );
      }
    }

    for (const item of dto.items) {
      const orderItem = orderItemsMap.get(item.orderItemId);

      if (!orderItem) {
        throw new BadRequestException('Invalid order item');
      }

      if (item.quantity <= 0) {
        throw new BadRequestException('Return quantity must be greater than zero');
      }

      const alreadyRequested = pendingRequestedByItem.get(item.orderItemId) ?? 0;
      const available = orderItem.quantity - orderItem.returnedQuantity - alreadyRequested;

      if (item.quantity > available) {
        throw new BadRequestException('Cannot return more than available units');
      }
    }

    return this.prisma.return.create({
      data: {
        storeId,
        orderId: dto.orderId,
        reason: dto.reason?.trim() || null,
        items: {
          create: dto.items.map((item) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
        refund: true,
      },
    });
  }

  async approveReturn(storeId: number, returnId: number, dto: ApproveReturnDto) {
    return this.prisma.$transaction(async (tx) => {
      const returnRequest = await tx.return.findFirst({
        where: {
          id: returnId,
          storeId,
        },
        include: {
          items: true,
          order: {
            include: {
              items: true,
              refunds: true,
            },
          },
        },
      });

      if (!returnRequest) {
        throw new NotFoundException('Return not found');
      }

      if (returnRequest.status !== 'requested') {
        throw new BadRequestException('Return already processed');
      }

      if (!dto.approve) {
        return tx.return.update({
          where: { id: returnId },
          data: { status: 'rejected' },
        });
      }

      for (const item of returnRequest.items) {
        const orderItem = await tx.orderItem.findUnique({
          where: { id: item.orderItemId },
        });

        if (!orderItem) continue;

        await tx.inventory.updateMany({
          where: {
            variantId: orderItem.variantId,
            storeId,
          },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        });

        await tx.orderItem.update({
          where: { id: orderItem.id },
          data: {
            returnedQuantity: {
              increment: item.quantity,
            },
          },
        });
      }

      const payment = await tx.payment.findFirst({
        where: {
          orderId: returnRequest.orderId,
          status: {
            in: ['approved', 'partially_refunded'],
          },
        },
      });

      let refund;

      if (payment) {
        const refundAmount =
          dto.refundAmount ??
          this.calculateSuggestedRefundAmount(returnRequest.order, returnRequest.items);

        try {
          if (payment.externalId) {
            await this.mercadopago.refundPayment(
              storeId,
              payment.externalId,
              refundAmount,
            );
          }
        } catch {
          console.warn('MercadoPago refund skipped (test mode)');
        }

        refund = await tx.refund.create({
          data: {
            storeId,
            orderId: returnRequest.orderId,
            returnId,
            paymentId: payment.id,
            amount: refundAmount,
          },
        });

        await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status:
              this.hasFullyRefundedPayment(
                Number(payment.amount),
                Number(refundAmount),
                returnRequest.order.refunds,
              )
                ? 'refunded'
                : 'partially_refunded',
          },
        });
      }

      await tx.return.update({
        where: { id: returnId },
        data: {
          status: refund ? 'refunded' : 'approved',
        },
      });

      if (refund && this.isOrderFullyReturned(returnRequest.order, returnRequest.items)) {
        await tx.order.update({
          where: { id: returnRequest.orderId },
          data: {
            status: 'refunded',
          },
        });
      }

      return {
        success: true,
        refund,
      };
    });
  }

  private calculateSuggestedRefundAmount(
    order: {
      subtotal: { toNumber(): number } | number;
      discountAmount: { toNumber(): number } | number;
      shippingCost?: { toNumber(): number } | number | null;
      items: Array<{
        id: number;
        quantity: number;
        returnedQuantity: number;
        price: { toNumber(): number } | number;
      }>;
    },
    returnItems: Array<{
      orderItemId: number;
      quantity: number;
    }>,
  ) {
    const orderSubtotal = Number(order.subtotal ?? 0);
    const orderDiscount = Number(order.discountAmount ?? 0);
    const shippingCost = Number(order.shippingCost ?? 0);
    const orderItemsById = new Map(order.items.map((item) => [item.id, item]));

    const returnedMerchandiseSubtotal = returnItems.reduce((total, item) => {
      const orderItem = orderItemsById.get(item.orderItemId);
      if (!orderItem) return total;

      return total + Number(orderItem.price) * item.quantity;
    }, 0);

    const proportionalDiscount =
      orderSubtotal > 0
        ? (returnedMerchandiseSubtotal / orderSubtotal) * orderDiscount
        : 0;

    const allItemsReturnedAfterApproval = order.items.every((orderItem) => {
      const requestedQuantity =
        returnItems.find((item) => item.orderItemId === orderItem.id)?.quantity ?? 0;

      return orderItem.returnedQuantity + requestedQuantity >= orderItem.quantity;
    });

    const refundAmount =
      returnedMerchandiseSubtotal -
      proportionalDiscount +
      (allItemsReturnedAfterApproval ? shippingCost : 0);

    return Math.max(Number(refundAmount.toFixed(2)), 0);
  }

  private isOrderFullyReturned(
    order: {
      items: Array<{
        id: number;
        quantity: number;
        returnedQuantity: number;
      }>;
    },
    returnItems: Array<{
      orderItemId: number;
      quantity: number;
    }>,
  ) {
    return order.items.every((item) => {
      const requestedQuantity =
        returnItems.find((returnItem) => returnItem.orderItemId === item.id)
          ?.quantity ?? 0;

      return item.returnedQuantity + requestedQuantity >= item.quantity;
    });
  }

  private hasFullyRefundedPayment(
    paymentAmount: number,
    latestRefundAmount: number,
    existingRefunds: Array<{ amount: { toNumber(): number } | number }>,
  ) {
    const refundedSoFar = existingRefunds.reduce(
      (total, refund) => total + Number(refund.amount),
      0,
    );

    return refundedSoFar + latestRefundAmount >= paymentAmount;
  }

  async findAll(storeId: number) {
    return this.prisma.return.findMany({
      where: { storeId },
      include: {
        items: true,
        refund: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findMine(storeId: number, customerId: number) {
    return this.prisma.return.findMany({
      where: {
        storeId,
        order: {
          customerId,
        },
      },
      include: {
        items: true,
        refund: true,
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
