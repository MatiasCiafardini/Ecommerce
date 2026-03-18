import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';
import { InventoryLockService } from '../inventory-lock/inventory-lock.service';

type OrderItemData = {
  variantId: number;
  quantity: number;
  price: number;
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private inventoryLockService: InventoryLockService,
  ) {}

  async create(data: CreateOrderDto, storeId: number) {
    return this.prisma.$transaction(async (tx) => {
      let subtotal = 0;

      const orderItems: OrderItemData[] = [];

      const variantIds = data.items.map((item) => item.variantId);

      const variants = await tx.productVariant.findMany({
        where: {
          id: { in: variantIds },
          product: {
            storeId,
          },
        },
        include: {
          inventories: {
            where: {
              storeId,
            },
          },
        },
      });

      const variantsMap = new Map(variants.map((v) => [v.id, v]));

      for (const item of data.items) {
        const variant = variantsMap.get(item.variantId);

        if (!variant) {
          throw new NotFoundException(`Variant ${item.variantId} not found`);
        }

        const inventory = variant.inventories[0];

        if (!inventory) {
          throw new NotFoundException(
            `Inventory missing for variant ${item.variantId}`,
          );
        }

        const available = inventory.quantity - inventory.reserved;

        if (available < item.quantity) {
          throw new BadRequestException(
            `Not enough stock for variant ${item.variantId}`,
          );
        }

        const price = Number(variant.price);

        subtotal += price * item.quantity;

        orderItems.push({
          variantId: item.variantId,
          quantity: item.quantity,
          price,
        });

        await this.inventoryLockService.reserveStockTx(
          tx,
          storeId,
          item.variantId,
          item.quantity,
        );
      }

      const total = subtotal;

      const order = await tx.order.create({
        data: {
          storeId,
          customerId: data.customerId,
          subtotal,
          discountAmount: 0,
          total,
          status: 'pending',
          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
        },
      });

      return order;
    });
  }

  /**
   * Order Lifecycle Status Update
   */
  async updateStatus(orderId: number, status: OrderStatus, storeId: number) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          storeId,
        },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      /**
       * VALIDAR TRANSICIÓN DE ESTADO
       */
      const validTransitions: Record<OrderStatus, OrderStatus[]> = {
        pending: ['cancelled', 'paid'],
        paid: ['processing', 'cancelled'],
        processing: ['packed', 'cancelled'],
        packed: ['shipped'],
        shipped: ['delivered'],
        delivered: [],
        cancelled: [],
        refunded: [],
      };

      const allowed = validTransitions[order.status];

      if (!allowed.includes(status)) {
        throw new BadRequestException(
          `Invalid status transition from ${order.status} to ${status}`,
        );
      }

      /**
       * CANCEL ORDER
       * liberar inventario reservado
       */
      if (status === 'cancelled') {
        for (const item of order.items) {
          await this.inventoryLockService.releaseStockTx(
            tx,
            storeId,
            item.variantId,
            item.quantity,
          );
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status },
      });
    });
  }

  findAll(storeId: number) {
    return this.prisma.order.findMany({
      where: {
        storeId,
      },
      include: {
        items: true,
        shipment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findOne(id: number, storeId: number) {
    return this.prisma.order.findFirst({
      where: {
        id,
        storeId,
      },
      include: {
        items: true,
        shipment: {
          include: {
            trackingEvents: true,
          },
        },
      },
    });
  }
}
