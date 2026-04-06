import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateManualSaleDto } from './dto/create-manual-sale.dto';
import { UpdateManualSaleDto } from './dto/update-manual-sale.dto';
import { ExportAccountingDto } from './dto/export-accounting.dto';
import { CancellationRequestStatus, OrderStatus } from '@prisma/client';
import { InventoryLockService } from '../inventory-lock/inventory-lock.service';
import { ShipmentService } from '../fulfillment/services/shipment.service';
import { MercadoPagoProvider } from '../payments/providers/mercadopago.provider';
import { RequestCancellationDto } from './dto/request-cancellation.dto';
import { ReviewCancellationRequestDto } from './dto/review-cancellation-request.dto';
import { AdminNotificationMailService } from '../notifications/admin-notification-mail.service';

type OrderItemData = {
  variantId: number;
  quantity: number;
  price: number;
};

type ManualSaleDiscountInput = {
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private inventoryLockService: InventoryLockService,
    private shipmentService: ShipmentService,
    private mercadopago: MercadoPagoProvider,
    private adminNotificationMailService: AdminNotificationMailService,
  ) {}

  async create(data: CreateOrderDto, storeId: number) {
    await this.ensureCustomer(storeId, data.customerId);

    const order = await this.prisma.$transaction(async (tx) => {
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

      return tx.order.create({
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
          customer: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });

    await this.adminNotificationMailService.sendAdminNotification({
      storeId,
      title: `Nuevo pedido #${order.id}`,
      body: `Se registro un nuevo pedido por ${this.formatMoney(order.total)}.`,
      href: `/account?section=admin-orders&orderId=${order.id}`,
      buttonLabel: `Ver pedido #${order.id}`,
    });

    const customerFullName = [order.customer?.firstName, order.customer?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (order.customer?.email) {
      await this.adminNotificationMailService.sendCustomerNotification({
        storeId,
        customerEmail: order.customer.email,
        customerName: customerFullName || order.customer.email,
        title: `Compra confirmada #${order.id}`,
        body: `tu compra fue registrada correctamente por ${this.formatMoney(order.total)}.`,
        href: `/account/orders/${order.id}`,
        buttonLabel: `Ver pedido #${order.id}`,
      });
    }

    return order;
  }

  async createManualSale(data: CreateManualSaleDto, storeId: number) {
    await this.ensureManualSalesEnabled(storeId);

    const customerId = data.customerId
      ? await this.ensureCustomer(storeId, data.customerId)
      : await this.ensureManualSaleCustomer(storeId);

    return this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItems: OrderItemData[] = [];
      const variantIds = data.items.map((item) => item.variantId);
      const shippingCost = Number(data.shippingCost ?? 0);
      const discount = this.resolveManualSaleDiscount({
        discountType: data.discountType,
        discountValue: data.discountValue,
      });
      const paymentStatus = data.paymentStatus ?? 'approved';
      const initialOrderStatus =
        paymentStatus === 'approved' ? OrderStatus.paid : OrderStatus.pending;

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

      const variantsMap = new Map(variants.map((variant) => [variant.id, variant]));

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

        const price = Number(item.price ?? variant.price);
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

      const discountAmount = this.calculateManualSaleDiscountAmount(
        subtotal,
        discount.type,
        discount.value,
      );
      const total = Math.max(subtotal - discountAmount + shippingCost, 0);
      const shippingMethod =
        data.shippingMethod?.trim() || 'Retiro en local';
      const customerFirstName =
        data.customerFirstName?.trim() ||
        data.customerLastName?.trim() ||
        'Venta';
      const customerLastName = data.customerLastName?.trim() || null;
      const isPickup = this.isPickupOrder({
        shippingMethod,
        shippingProvider: shippingMethod.toLowerCase().includes('retiro')
          ? 'store'
          : 'manual',
      });

      const order = await tx.order.create({
        data: {
          storeId,
          customerId,
          subtotal,
          shippingCost,
          discountAmount,
          total,
          status: initialOrderStatus,
          shippingMethod,
          shippingProvider: isPickup ? 'store' : 'manual',
          customerEmailSnapshot:
            data.customerEmail?.trim() || `manual-sale@store-${storeId}.local`,
          customerFirstNameSnapshot: customerFirstName,
          customerLastNameSnapshot: customerLastName,
          customerPhoneSnapshot: data.customerPhone?.trim() || null,
          shippingFirstNameSnapshot: customerFirstName,
          shippingLastNameSnapshot: customerLastName,
          shippingPhoneSnapshot: data.customerPhone?.trim() || null,
          items: {
            create: orderItems,
          },
          payments: {
            create: {
              storeId,
              provider: 'manual',
              method: data.paymentMethod?.trim() || 'Efectivo',
              status: paymentStatus,
              amount: total,
              reference: data.reference?.trim() || null,
              notes: data.notes?.trim() || null,
              metadata: {
                origin: 'manual_sale',
                discountType: discount.type,
                discountValue: discount.value,
              },
            },
          },
        },
        include: this.orderInclude(),
      });

      if (paymentStatus === 'approved') {
        for (const item of orderItems) {
          await this.inventoryLockService.confirmStockTx(
            tx,
            storeId,
            item.variantId,
            item.quantity,
          );
        }
      }

      return this.withCancellationRequests(order);
    });
  }

  async updateManualSale(
    orderId: number,
    data: UpdateManualSaleDto,
    storeId: number,
  ) {
    await this.ensureManualSalesEnabled(storeId);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          storeId,
          payments: {
            some: {
              provider: 'manual',
            },
          },
        },
        include: this.orderInclude(),
      });

      if (!order) {
        throw new NotFoundException('Manual sale not found');
      }

      if (order.status === OrderStatus.cancelled) {
        throw new BadRequestException(
          'Cancelled manual sales can no longer be edited',
        );
      }

      const manualPayment = order.payments.find(
        (payment) => payment.provider === 'manual',
      );

      const behavesAsPending =
        manualPayment?.status === 'pending' || order.status === OrderStatus.pending;

      const incomingItems = data.items ?? [];
      const incomingIds = new Set(incomingItems.map((item) => item.orderItemId));

      if (incomingIds.size !== incomingItems.length) {
        throw new BadRequestException('Duplicate order items are not allowed');
      }

      for (const item of incomingItems) {
        if (!order.items.some((existing) => existing.id === item.orderItemId)) {
          throw new BadRequestException(
            `Order item ${item.orderItemId} does not belong to this manual sale`,
          );
        }
      }

      let subtotal = 0;

      for (const existingItem of order.items) {
        const nextItem = incomingItems.find(
          (item) => item.orderItemId === existingItem.id,
        );

        const inventory = await tx.inventory.findUnique({
          where: {
            storeId_variantId: {
              storeId,
              variantId: existingItem.variantId,
            },
          },
        });

        if (!inventory) {
          throw new NotFoundException(
            `Inventory missing for variant ${existingItem.variantId}`,
          );
        }

        if (!nextItem) {
          if (behavesAsPending) {
            await tx.inventory.update({
              where: {
                storeId_variantId: {
                  storeId,
                  variantId: existingItem.variantId,
                },
              },
              data: {
                reserved: {
                  decrement: existingItem.quantity,
                },
              },
            });
          } else {
            await tx.inventory.update({
              where: {
                storeId_variantId: {
                  storeId,
                  variantId: existingItem.variantId,
                },
              },
              data: {
                quantity: {
                  increment: existingItem.quantity,
                },
              },
            });
          }

          await tx.orderItem.delete({
            where: {
              id: existingItem.id,
            },
          });
          continue;
        }

        const delta = nextItem.quantity - existingItem.quantity;
        const available = inventory.quantity - inventory.reserved;

        if (delta > 0 && available < delta) {
          throw new BadRequestException(
            `Not enough stock for variant ${existingItem.variantId}`,
          );
        }

        if (delta !== 0) {
          if (behavesAsPending) {
            await tx.inventory.update({
              where: {
                storeId_variantId: {
                  storeId,
                  variantId: existingItem.variantId,
                },
              },
              data: {
                reserved:
                  delta > 0
                    ? { increment: delta }
                    : { decrement: Math.abs(delta) },
              },
            });
          } else {
            await tx.inventory.update({
              where: {
                storeId_variantId: {
                  storeId,
                  variantId: existingItem.variantId,
                },
              },
              data: {
                quantity:
                  delta > 0
                    ? { decrement: delta }
                    : { increment: Math.abs(delta) },
              },
            });
          }
        }

        await tx.orderItem.update({
          where: {
            id: existingItem.id,
          },
          data: {
            quantity: nextItem.quantity,
            price: nextItem.price,
          },
        });

        subtotal += nextItem.quantity * Number(nextItem.price);
      }

      const discount = this.resolveManualSaleDiscount({
        discountType: data.discountType,
        discountValue: data.discountValue,
      }, order.payments.find((payment) => payment.provider === 'manual')?.metadata);
      const discountAmount = this.calculateManualSaleDiscountAmount(
        subtotal,
        discount.type,
        discount.value,
      );
      const total = Math.max(
        subtotal - discountAmount + Number(order.shippingCost ?? 0),
        0,
      );

      const updated = await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          subtotal,
          discountAmount,
          total,
          payments: manualPayment
            ? {
                update: {
                  where: {
                    id: manualPayment.id,
                  },
                  data: {
                    amount: total,
                    method: data.paymentMethod?.trim() || manualPayment.method,
                    metadata: {
                      ...(manualPayment.metadata as Record<string, unknown> | null),
                      discountType: discount.type,
                      discountValue: discount.value,
                    },
                  },
                },
              }
            : undefined,
        },
        include: this.orderInclude(),
      });

      return this.withCancellationRequests(updated);
    });
  }

  private async ensureManualSalesEnabled(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        manualSalesEnabled: true,
      },
    } as any);

    if (!store?.manualSalesEnabled) {
      throw new ForbiddenException(
        'Manual sales module is disabled for this store',
      );
    }
  }

  async updateStatus(orderId: number, status: OrderStatus, storeId: number) {
    let shouldProvisionShipment = false;

    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          storeId,
        },
        include: {
          shipment: true,
          items: {
            include: {
              variant: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

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

      const isPickupOrder = this.isPickupOrder({
        shippingMethod: order.shippingMethod,
        shippingProvider: order.shippingProvider,
      });

      const requiresShipping = !isPickupOrder;

      if (status === 'packed' && requiresShipping && !order.shipment) {
        this.buildShippingAddress(order);

        if (!order.shippingPostalCodeSnapshot?.trim()) {
          throw new BadRequestException(
            'Shipping postal code snapshot is required before packing this order',
          );
        }

        shouldProvisionShipment = true;
      }

      if (status === 'shipped' && requiresShipping) {
        if (!order.shipment) {
          throw new BadRequestException(
            'Shipment must exist before dispatching this order',
          );
        }

        if (this.requiresManualTrackingForDispatch(order)) {
          if (!order.shipment.carrier?.trim()) {
            throw new BadRequestException(
              'Carrier is required before dispatching this order',
            );
          }

          if (!order.shipment.trackingNumber?.trim()) {
            throw new BadRequestException(
              'Tracking number is required before dispatching this order',
            );
          }
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status },
        include: this.orderInclude(),
      });
    });

    if (shouldProvisionShipment) {
      const shipment = await this.shipmentService.createOrderShipment(
        storeId,
        orderId,
      );

      const enrichedResult = {
        ...this.withCancellationRequests(result),
        shipment,
      };

      await this.sendCustomerOrderStatusNotification(storeId, enrichedResult);

      return enrichedResult;
    }

    await this.sendCustomerOrderStatusNotification(
      storeId,
      this.withCancellationRequests(result),
    );

    return this.withCancellationRequests(result);
  }

  findAll(storeId: number) {
    return this.prisma.order.findMany({
      where: {
        storeId,
        payments: {
          none: {
            provider: 'manual',
          },
        },
      },
      include: this.orderInclude(),
      orderBy: {
        createdAt: 'desc',
      },
    }).then((orders) => this.withCancellationRequestsList(orders));
  }

  findManualSales(storeId: number) {
    return this.prisma.order.findMany({
      where: {
        storeId,
        payments: {
          some: {
            provider: 'manual',
          },
        },
      },
      include: this.orderInclude(),
      orderBy: {
        createdAt: 'desc',
      },
    }).then((orders) => this.withCancellationRequestsList(orders));
  }

  async exportAccountingCsv(storeId: number, query: ExportAccountingDto) {
    const orders = await this.prisma.order.findMany({
      where: this.buildAccountingExportWhere(storeId, query),
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        createdAt: true,
        status: true,
        subtotal: true,
        discountAmount: true,
        discountCode: true,
        total: true,
        shippingCost: true,
        shippingMethod: true,
        shippingProvider: true,
        customerEmailSnapshot: true,
        customerFirstNameSnapshot: true,
        customerLastNameSnapshot: true,
        payments: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            provider: true,
            method: true,
            status: true,
            amount: true,
            externalId: true,
            reference: true,
            createdAt: true,
            reviewedAt: true,
            metadata: true,
          },
        },
        refunds: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            amount: true,
            createdAt: true,
            paymentId: true,
          },
        },
      },
    });

    const header = [
      'Fecha pedido',
      'Pedido',
      'Estado pedido',
      'Cliente',
      'Email',
      'Subtotal',
      'Descuento',
      'Codigo descuento',
      'Envio',
      'Total',
      'Proveedor pago',
      'Metodo pago',
      'Estado pago',
      'Monto pago',
      'Referencia externa',
      'Referencia interna',
      'Cuotas',
      'Fecha pago',
      'Fecha revision pago',
      'Cantidad refunds',
      'Monto refunds',
      'Fecha ultimo refund',
      'Proveedor envio',
      'Metodo envio',
    ];

    const lines = orders.map((order) => {
      const primaryPayment = order.payments[0] ?? null;
      const paymentMetadata =
        primaryPayment?.metadata && typeof primaryPayment.metadata === 'object'
          ? (primaryPayment.metadata as Record<string, unknown>)
          : null;
      const installments =
        typeof paymentMetadata?.installments === 'number'
          ? paymentMetadata.installments
          : typeof paymentMetadata?.installments === 'string'
            ? paymentMetadata.installments
            : '';
      const refundAmount = order.refunds.reduce(
        (sum, refund) => sum + Number(refund.amount ?? 0),
        0,
      );
      const lastRefund = order.refunds[order.refunds.length - 1] ?? null;

      return [
        this.toCsvDate(order.createdAt),
        order.id,
        order.status,
        this.orderCustomerName(order),
        order.customerEmailSnapshot ?? '',
        this.toMoneyValue(order.subtotal),
        this.toMoneyValue(order.discountAmount),
        order.discountCode ?? '',
        this.toMoneyValue(order.shippingCost),
        this.toMoneyValue(order.total),
        primaryPayment?.provider ?? '',
        primaryPayment?.method ?? '',
        primaryPayment?.status ?? '',
        this.toMoneyValue(primaryPayment?.amount ?? null),
        primaryPayment?.externalId ?? '',
        primaryPayment?.reference ?? '',
        installments,
        this.toCsvDate(primaryPayment?.createdAt ?? null),
        this.toCsvDate(primaryPayment?.reviewedAt ?? null),
        order.refunds.length,
        refundAmount.toFixed(2),
        this.toCsvDate(lastRefund?.createdAt ?? null),
        order.shippingProvider ?? '',
        order.shippingMethod ?? '',
      ]
        .map((value) => this.escapeCsv(value))
        .join(',');
    });

    const fromLabel = query.from?.trim() || 'inicio';
    const toLabel = query.to?.trim() || 'hoy';

    return {
      filename: `contable-store-${storeId}-${fromLabel}-${toLabel}.csv`,
      csv: [header.join(','), ...lines].join('\n'),
    };
  }

  findOne(id: number, storeId: number) {
    return this.prisma.order.findFirst({
      where: {
        id,
        storeId,
      },
      include: this.orderInclude(),
    }).then((order) => (order ? this.withCancellationRequests(order) : order));
  }

  findMine(storeId: number, customerId: number) {
    return this.prisma.order.findMany({
      where: {
        storeId,
        customerId,
      },
      include: this.orderInclude(),
      orderBy: {
        createdAt: 'desc',
      },
    }).then((orders) => this.withCancellationRequestsList(orders));
  }

  async getAdminNotifications(storeId: number) {
    const [orders, returns, cancellations] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          storeId,
          payments: {
            none: {
              provider: 'manual',
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 8,
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true,
          customerEmailSnapshot: true,
          customerFirstNameSnapshot: true,
          customerLastNameSnapshot: true,
          customer: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.return.findMany({
        where: {
          storeId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 8,
        select: {
          id: true,
          orderId: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.cancellationRequest.findMany({
        where: {
          storeId,
          status: CancellationRequestStatus.requested,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 8,
        select: {
          id: true,
          orderId: true,
          reason: true,
          createdAt: true,
          customer: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    const items = [
      ...orders.map((order) => ({
        id: `admin-order-${order.id}`,
        title: `Nuevo pedido #${order.id}`,
        body: `${this.orderCustomerLabel(order)} · ${this.formatMoney(order.total)} · ${order.status}`,
        createdAt: order.createdAt,
        href: `/account?section=admin-orders&orderId=${order.id}`,
      })),
      ...returns.map((entry) => ({
        id: `admin-return-${entry.id}`,
        title: `Nueva devolucion #${entry.id}`,
        body: `Pedido #${entry.orderId} · Estado ${entry.status}`,
        createdAt: entry.createdAt,
        href: '/account?section=admin-returns',
      })),
      ...cancellations.map((entry) => ({
        id: `admin-cancellation-${entry.id}`,
        title: `Solicitud de cancelacion #${entry.id}`,
        body: `Pedido #${entry.orderId} · ${this.customerLabel(entry.customer)}${entry.reason ? ` · ${entry.reason}` : ''}`,
        createdAt: entry.createdAt,
        href: `/account?section=admin-orders&orderId=${entry.orderId}`,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 8)
      .map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      }));

    return {
      items,
    };
  }

  async getCustomerNotifications(storeId: number, customerId: number) {
    const orders = await this.prisma.order.findMany({
      where: {
        storeId,
        customerId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 12,
      select: {
        id: true,
        total: true,
        status: true,
        createdAt: true,
        shipment: {
          select: {
            trackingNumber: true,
            trackingEvents: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
              select: {
                createdAt: true,
              },
            },
          },
        },
      },
    });

    const items = orders
      .flatMap((order) => {
        const createdNotification = {
          id: `customer-order-created-${order.id}`,
          title: `Compra confirmada #${order.id}`,
          body: `Tu compra fue registrada correctamente por ${this.formatMoney(order.total)}.`,
          createdAt: order.createdAt,
          href: `/account/orders/${order.id}`,
        };

        const statusTime =
          order.shipment?.trackingEvents?.[0]?.createdAt ??
          order.createdAt;

        const statusNotification =
          order.status !== 'pending'
            ? {
                id: `customer-order-status-${order.id}-${order.status}`,
                title: this.customerStatusTitle(order.id, order.status),
                body: this.customerStatusBody(order.status, order.shipment?.trackingNumber),
                createdAt: statusTime,
                href: `/account/orders/${order.id}`,
              }
            : null;

        return statusNotification
          ? [statusNotification, createdNotification]
          : [createdNotification];
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 8)
      .map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      }));

    return {
      items,
    };
  }

  async findOneMine(orderId: number, storeId: number, customerId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        storeId,
        customerId,
      },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.withCancellationRequests(order);
  }

  async cancelMine(orderId: number, storeId: number, customerId: number) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          storeId,
          customerId,
        },
        include: {
          items: true,
          payments: true,
          shipment: true,
          refunds: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== 'pending') {
        throw new BadRequestException(
          'This order can no longer be cancelled directly from the customer account',
        );
      }

      if (order.shipment && ['shipped', 'in_transit', 'delivered'].includes(order.shipment.status)) {
        throw new BadRequestException(
          'This order already entered the shipping flow and cannot be cancelled',
        );
      }

      for (const item of order.items) {
        await this.inventoryLockService.releaseStockTx(
          tx,
          storeId,
          item.variantId,
          item.quantity,
        );
      }

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.cancelled,
        },
        include: this.orderInclude(),
      });

      return this.withCancellationRequests(updated);
    });
  }

  async requestCancellation(
    orderId: number,
    storeId: number,
    customerId: number,
    dto: RequestCancellationDto,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        storeId,
        customerId,
      },
      include: {
        shipment: true,
        cancellationRequest: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!['paid', 'processing', 'packed'].includes(order.status)) {
      throw new BadRequestException(
        'Cancellation requests are only available once the order is paid and before dispatch',
      );
    }

    if (order.shipment && ['shipped', 'in_transit', 'delivered'].includes(order.shipment.status)) {
      throw new BadRequestException(
        'This order already entered the shipping flow and can no longer request cancellation',
      );
    }

    const existingRequest = order.cancellationRequest;

    if (existingRequest?.status === CancellationRequestStatus.requested) {
      throw new BadRequestException('This order already has a pending cancellation ticket');
    }

    const request = await this.prisma.cancellationRequest.upsert({
      where: {
        orderId: order.id,
      },
      update: {
        status: CancellationRequestStatus.requested,
        reason: dto.reason?.trim() || null,
        adminNotes: null,
        refundAmount: null,
        reviewedAt: null,
      },
      create: {
        storeId,
        orderId: order.id,
        customerId,
        reason: dto.reason?.trim() || null,
      },
      include: this.cancellationRequestInclude(),
    });

    await this.adminNotificationMailService.sendAdminNotification({
      storeId,
      title: `Solicitud de cancelacion #${request.id}`,
      body: `El pedido #${order.id} pidio cancelacion${request.reason ? `: ${request.reason}` : '.'}`,
      href: `/account?section=admin-orders&orderId=${order.id}`,
      buttonLabel: `Revisar pedido #${order.id}`,
    });

    return request;
  }

  async findCancellationRequests(storeId: number) {
    return this.prisma.cancellationRequest.findMany({
      where: {
        storeId,
      },
      include: this.cancellationRequestInclude(),
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async reviewCancellationRequest(
    requestId: number,
    storeId: number,
    dto: ReviewCancellationRequestDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.cancellationRequest.findFirst({
        where: {
          id: requestId,
          storeId,
        },
        include: {
          order: {
            include: {
              items: true,
              payments: true,
              refunds: true,
              shipment: true,
            },
          },
        },
      });

      if (!request) {
        throw new NotFoundException('Cancellation request not found');
      }

      if (request.status !== CancellationRequestStatus.requested) {
        throw new BadRequestException('Cancellation request already processed');
      }

      if (!dto.approve) {
        return tx.cancellationRequest.update({
          where: { id: request.id },
          data: {
            status: CancellationRequestStatus.rejected,
            adminNotes: dto.adminNotes?.trim() || null,
            reviewedAt: new Date(),
          },
          include: this.cancellationRequestInclude(),
        });
      }

      const order = request.order;

      if (!['paid', 'processing', 'packed'].includes(order.status)) {
        throw new BadRequestException(
          'The order is no longer in a cancellable operational stage',
        );
      }

      if (order.shipment && ['shipped', 'in_transit', 'delivered'].includes(order.shipment.status)) {
        throw new BadRequestException('The order already entered shipping');
      }

      for (const item of order.items) {
        await tx.inventory.update({
          where: {
            storeId_variantId: {
              storeId,
              variantId: item.variantId,
            },
          },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        });
      }

      const approvedPayment = order.payments.find((payment) =>
        ['approved', 'partially_refunded'].includes(payment.status),
      );
      const alreadyRefunded = order.refunds.reduce(
        (total, refund) => total + Number(refund.amount),
        0,
      );
      const remainingRefundable = approvedPayment
        ? Math.max(Number(approvedPayment.amount) - alreadyRefunded, 0)
        : 0;
      const refundAmount = approvedPayment
        ? dto.refundAmount ?? remainingRefundable
        : dto.refundAmount ?? null;

      if (approvedPayment && refundAmount && refundAmount > 0) {
        try {
          if (approvedPayment.externalId) {
            await this.mercadopago.refundPayment(
              storeId,
              approvedPayment.externalId,
              refundAmount ?? undefined,
            );
          }
        } catch {
          console.warn('MercadoPago cancellation refund skipped (test mode)');
        }

        await tx.refund.create({
          data: {
            storeId,
            orderId: order.id,
            paymentId: approvedPayment.id,
            amount: refundAmount ?? 0,
          },
        });

        await tx.payment.update({
          where: {
            id: approvedPayment.id,
          },
          data: {
            status:
              refundAmount !== null &&
              alreadyRefunded + refundAmount >= Number(approvedPayment.amount)
                ? 'refunded'
                : 'partially_refunded',
          },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.cancelled,
        },
      });

      return tx.cancellationRequest.update({
        where: { id: request.id },
        data: {
          status: approvedPayment
            && refundAmount
            ? CancellationRequestStatus.refunded
            : CancellationRequestStatus.approved,
          adminNotes: dto.adminNotes?.trim() || null,
          refundAmount,
          reviewedAt: new Date(),
        },
        include: this.cancellationRequestInclude(),
      });
    });
  }

  private async ensureCustomer(storeId: number, customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        storeId,
      },
      select: { id: true },
    });

    if (!customer) {
      throw new ForbiddenException('Customer does not belong to this store');
    }

    return customer.id;
  }

  private async ensureManualSaleCustomer(storeId: number) {
    const email = `manual-sale@store-${storeId}.local`;

    const customer = await this.prisma.customer.upsert({
      where: {
        storeId_email: {
          storeId,
          email,
        },
      },
      update: {
        firstName: 'Venta',
        lastName: 'mostrador',
      },
      create: {
        storeId,
        email,
        firstName: 'Venta',
        lastName: 'mostrador',
      },
      select: {
        id: true,
      },
    });

    return customer.id;
  }

  private isPickupOrder(order: {
    shippingMethod?: string | null;
    shippingProvider?: string | null;
  }) {
    const shippingMethod = order.shippingMethod?.trim().toLowerCase() ?? '';
    const shippingProvider = order.shippingProvider?.trim().toLowerCase() ?? '';

    return (
      shippingMethod.includes('pickup') ||
      shippingMethod.includes('retiro') ||
      shippingProvider === 'store'
    );
  }

  private resolveManualSaleDiscount(
    input: ManualSaleDiscountInput,
    existingMetadata?: unknown,
  ) {
    const metadata =
      existingMetadata && typeof existingMetadata === 'object'
        ? (existingMetadata as Record<string, unknown>)
        : null;

    const discountType =
      input.discountType ??
      (metadata?.discountType === 'fixed' ? 'fixed' : 'percentage');
    const rawDiscountValue =
      input.discountValue ??
      (typeof metadata?.discountValue === 'number'
        ? metadata.discountValue
        : typeof metadata?.discountValue === 'string'
          ? Number(metadata.discountValue)
          : 0);

    return {
      type: discountType,
      value: Number.isFinite(rawDiscountValue) ? Math.max(rawDiscountValue, 0) : 0,
    };
  }

  private calculateManualSaleDiscountAmount(
    subtotal: number,
    discountType: 'percentage' | 'fixed',
    discountValue: number,
  ) {
    if (subtotal <= 0 || discountValue <= 0) {
      return 0;
    }

    if (discountType === 'percentage') {
      const normalizedPercentage = Math.min(discountValue, 100);
      return Number(((subtotal * normalizedPercentage) / 100).toFixed(2));
    }

    return Number(Math.min(discountValue, subtotal).toFixed(2));
  }

  private buildShippingAddress(order: {
    shippingAddress1Snapshot?: string | null;
    shippingAddress2Snapshot?: string | null;
    shippingCitySnapshot?: string | null;
    shippingStateSnapshot?: string | null;
    shippingCountrySnapshot?: string | null;
  }) {
    const address = [
      order.shippingAddress1Snapshot,
      order.shippingAddress2Snapshot,
      order.shippingCitySnapshot,
      order.shippingStateSnapshot,
      order.shippingCountrySnapshot,
    ]
      .filter(Boolean)
      .join(', ')
      .trim();

    if (!address) {
      throw new BadRequestException(
        'Shipping address snapshot is required before packing this order',
      );
    }

    return address;
  }

  private requiresManualTrackingForDispatch(order: {
    shippingMethod?: string | null;
    shipment?: {
      carrier?: string | null;
    } | null;
  }) {
    const shippingMethod = order.shippingMethod?.trim().toLowerCase() ?? '';

    if (
      shippingMethod.includes('coordinar') ||
      shippingMethod.includes('retiro') ||
      shippingMethod.includes('pickup')
    ) {
      return false;
    }

    return true;
  }

  private orderInclude() {
    return {
      customer: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: {
                  images: {
                    orderBy: {
                      position: 'asc' as const,
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
      shipment: {
        include: {
          trackingEvents: true,
        },
      },
      payments: true,
      returns: {
        include: {
          items: true,
          refund: true,
        },
        orderBy: {
          createdAt: 'desc' as const,
        },
      },
      refunds: true,
      cancellationRequest: true,
    };
  }

  private withCancellationRequests<
    T extends { cancellationRequest?: unknown | null }
  >(order: T) {
    const { cancellationRequest, ...rest } = order as T & {
      cancellationRequest?: unknown | null;
    };

    return this.withProtectedPaymentProofs({
      ...rest,
      cancellationRequests: cancellationRequest ? [cancellationRequest] : [],
    } as T & { cancellationRequests: unknown[] });
  }

  private withCancellationRequestsList<
    T extends { cancellationRequest?: unknown | null }
  >(orders: T[]) {
    return orders.map((order) => this.withCancellationRequests(order));
  }

  private withProtectedPaymentProofs<T extends Record<string, any>>(order: T): T {
    if (!Array.isArray(order.payments)) {
      return order;
    }

    return {
      ...order,
      payments: order.payments.map((payment) => ({
        ...payment,
        proofUrl: payment.proofUrl ? `/payments/${payment.id}/proof` : null,
      })),
    } as T;
  }

  private cancellationRequestInclude() {
    return {
      customer: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      order: {
        select: {
          id: true,
          status: true,
          total: true,
          createdAt: true,
          shippingProvider: true,
          shippingMethod: true,
        },
      },
    };
  }

  private buildAccountingExportWhere(storeId: number, query: ExportAccountingDto) {
    const where: {
      storeId: number;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
      status?: OrderStatus;
    } = {
      storeId,
    };

    const fromDate = this.parseDateBoundary(query.from, 'start');
    const toDate = this.parseDateBoundary(query.to, 'end');

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = fromDate;
      }
      if (toDate) {
        where.createdAt.lte = toDate;
      }
    }

    if (query.status && query.status !== 'all') {
      where.status = query.status as OrderStatus;
    }

    return where;
  }

  private parseDateBoundary(
    value: string | undefined,
    boundary: 'start' | 'end',
  ) {
    const raw = value?.trim();

    if (!raw) {
      return null;
    }

    const parsed = new Date(
      boundary === 'start' ? `${raw}T00:00:00.000Z` : `${raw}T23:59:59.999Z`,
    );

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid date value: ${raw}`);
    }

    return parsed;
  }

  private toCsvDate(value: Date | string | null | undefined) {
    if (!value) {
      return '';
    }

    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
  }

  private toMoneyValue(value: unknown) {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    return Number(value).toFixed(2);
  }

  private orderCustomerName(order: {
    customerFirstNameSnapshot?: string | null;
    customerLastNameSnapshot?: string | null;
  }) {
    return [order.customerFirstNameSnapshot, order.customerLastNameSnapshot]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  private escapeCsv(value: unknown) {
    const normalized =
      value === null || value === undefined ? '' : String(value).replace(/\r?\n/g, ' ');

    if (/[",;]/.test(normalized)) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }

    return normalized;
  }

  private formatMoney(value: { toNumber(): number } | number) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(Number(value));
  }

  private customerLabel(customer?: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null) {
    const fullName = [customer?.firstName, customer?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return fullName || customer?.email || 'Cliente sin identificar';
  }

  private orderCustomerLabel(order: {
    customerEmailSnapshot?: string | null;
    customerFirstNameSnapshot?: string | null;
    customerLastNameSnapshot?: string | null;
    customer?: {
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    } | null;
  }) {
    const fullName = [
      order.customerFirstNameSnapshot ?? order.customer?.firstName,
      order.customerLastNameSnapshot ?? order.customer?.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return (
      fullName ||
      order.customerEmailSnapshot ||
      order.customer?.email ||
      'Cliente sin identificar'
    );
  }

  private customerStatusTitle(orderId: number, status: string) {
    if (status === 'delivered') return `Pedido #${orderId} entregado`;
    if (status === 'shipped') return `Pedido #${orderId} en camino`;
    if (status === 'packed') return `Pedido #${orderId} listo para despacho`;
    if (status === 'processing') return `Pedido #${orderId} en preparacion`;
    if (status === 'paid') return `Pago confirmado para tu pedido #${orderId}`;
    return `Actualizacion de pedido #${orderId}`;
  }

  private customerStatusBody(status: string, trackingNumber?: string | null) {
    if (status === 'delivered') {
      return 'Tu pedido figura como entregado. Si necesitas ayuda, podes revisar el detalle desde tu cuenta.';
    }

    if (status === 'shipped') {
      return trackingNumber
        ? `Ya fue despachado. Tracking: ${trackingNumber}.`
        : 'Ya fue despachado y pronto vas a ver mas informacion del seguimiento.';
    }

    return `Estado actual: ${status}.`;
  }

  private async sendCustomerOrderStatusNotification(
    storeId: number,
    order: {
      id: number;
      status: string;
      customerEmailSnapshot?: string | null;
      customerFirstNameSnapshot?: string | null;
      customerLastNameSnapshot?: string | null;
      customer?: {
        email?: string | null;
        firstName?: string | null;
        lastName?: string | null;
      } | null;
      shipment?: {
        trackingNumber?: string | null;
      } | null;
    },
  ) {
    if (order.status === 'pending') {
      return;
    }

    const customerEmail =
      order.customerEmailSnapshot?.trim() || order.customer?.email?.trim();

    if (!customerEmail) {
      return;
    }

    const customerName = [
      order.customerFirstNameSnapshot ?? order.customer?.firstName,
      order.customerLastNameSnapshot ?? order.customer?.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    await this.adminNotificationMailService.sendCustomerNotification({
      storeId,
      customerEmail,
      customerName: customerName || customerEmail,
      title: this.customerStatusTitle(order.id, order.status),
      body: this.customerStatusBody(
        order.status,
        order.shipment?.trackingNumber,
      ),
      href: `/account/orders/${order.id}`,
      buttonLabel: `Abrir pedido #${order.id}`,
    });
  }
}
