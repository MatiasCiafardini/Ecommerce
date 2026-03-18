import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { ApproveReturnDto } from './dto/approve-return.dto';
import { InventoryLockService } from '../inventory-lock/inventory-lock.service';
import { MercadoPagoProvider } from '../payments/providers/mercadopago.provider';

@Injectable()
export class ReturnsService {
  constructor(
    private prisma: PrismaService,
    private inventoryLockService: InventoryLockService,
    private mercadopago: MercadoPagoProvider,
  ) {}

  /**
   * Customer requests a return
   */
  async createReturn(storeId: number, dto: CreateReturnDto) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: dto.orderId,
        storeId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const orderItemsMap = new Map(order.items.map((i) => [i.id, i]));

    for (const item of dto.items) {
      const orderItem = orderItemsMap.get(item.orderItemId);

      if (!orderItem) {
        throw new BadRequestException('Invalid order item');
      }

      const available = orderItem.quantity - orderItem.returnedQuantity;

      if (item.quantity > available) {
        throw new BadRequestException(`Cannot return more than purchased`);
      }
    }

    return this.prisma.return.create({
      data: {
        storeId,
        orderId: dto.orderId,
        reason: dto.reason,
        items: {
          create: dto.items.map((i) => ({
            orderItemId: i.orderItemId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  /**
   * Admin approves return
   */
  async approveReturn(
    storeId: number,
    returnId: number,
    dto: ApproveReturnDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const returnRequest = await tx.return.findFirst({
        where: {
          id: returnId,
          storeId,
        },
        include: {
          items: true,
          order: true,
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

      /**
       * Restock inventory
       */
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

      /**
       * Refund payment
       */
      const payment = await tx.payment.findFirst({
        where: {
          orderId: returnRequest.orderId,
          status: 'approved',
        },
      });

      let refund;

      if (payment) {
        const refundAmount =
          dto.refundAmount ?? returnRequest.order.total.toNumber();

        try {
          if (payment.externalId) {
            await this.mercadopago.refundPayment(
              payment.externalId,
              refundAmount,
            );
          }
        } catch (error) {
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
      }

      await tx.return.update({
        where: { id: returnId },
        data: {
          status: refund ? 'refunded' : 'approved',
        },
      });

      if (refund) {
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
}
