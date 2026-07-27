import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import {
  calculateManualSaleDiscountAmount,
  resolveLabelNormalPrice,
  resolveStorePricingPolicy,
  roundToNearestHundred,
  type StorePricingPolicy,
} from '../../common/price-input-mode';
import { SimplePdfDocument } from '../../common/utils/pdf-document';
import { normalizeAdministrativePaymentMethod } from '../../common/manual-payment-methods';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateManualSaleDto } from './dto/create-manual-sale.dto';
import { UpdateManualSaleDto } from './dto/update-manual-sale.dto';
import { ExportAccountingDto } from './dto/export-accounting.dto';
import { CancellationRequestStatus, CurrentAccount, OrderStatus } from '@prisma/client';
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

type ManualPriceMode = 'cash' | 'card';

type ManualPriceChange = {
  variantId: number;
  productTitle: string;
  quantity: number;
  catalogPrice: number;
  enteredPrice: number;
  cardPrice: number;
  cashPrice: number;
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

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
        title: 'Compra confirmada',
        body: `Tu compra fue registrada correctamente por ${this.formatMoney(order.total)}.`,
        href: `/account/orders/${order.id}`,
        buttonLabel: 'Ver detalle',
      });
    }

    return order;
  }

  async createManualSale(
    data: CreateManualSaleDto,
    storeId: number,
    createdByUserId?: number,
  ) {
    await this.ensureManualSalesEnabled(storeId);

    const requestedPaymentMethods = data.payments?.length
      ? data.payments.map((payment) => payment.method)
      : [data.paymentMethod];
    const currentAccountPayment = requestedPaymentMethods.some((method) =>
      this.isCurrentAccountPaymentMethod(method),
    );
    const cashContext = await this.resolveManualSaleCashContext(
      storeId,
      createdByUserId,
      data.storeLocationId,
    );

    if (currentAccountPayment && !data.customerId) {
      throw new BadRequestException(
        'Para vender en cuenta corriente, seleccioná o registrá un cliente.',
      );
    }

    const pricingPolicy = await this.resolvePricingPolicy(storeId);
    const manualPriceMode = data.manualPriceMode;
    const customerId = data.customerId
      ? await this.ensureCustomer(storeId, data.customerId)
      : await this.ensureManualSaleCustomer(storeId);

    return this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItems: OrderItemData[] = [];
      const manualPriceChanges: ManualPriceChange[] = [];
      const variantIds = data.items.map((item) => item.variantId);
      const shippingCost = Number(data.shippingCost ?? 0);
      const discount = this.resolveManualSaleDiscount({
        discountType: data.discountType,
        discountValue: data.discountValue,
      });
      const variants = await tx.productVariant.findMany({
        where: {
          id: { in: variantIds },
          product: {
            storeId,
          },
        },
        include: {
          product: {
            select: {
              title: true,
            },
          },
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

        const enteredPrice = this.roundCurrency(
          Math.max(Number(item.enteredPrice ?? item.price ?? variant.price), 0),
        );
        const catalogPrice = Number(item.catalogPrice);
        const hasManualPriceChange =
          Number.isFinite(catalogPrice) &&
          Math.abs(enteredPrice - this.roundCurrency(catalogPrice)) > 0.01;

        if (hasManualPriceChange && currentAccountPayment && !manualPriceMode) {
          throw new BadRequestException(
            'Selecciona si los precios modificados manualmente son efectivo o tarjeta.',
          );
        }

        const price = hasManualPriceChange && currentAccountPayment
          ? this.resolveManualSaleBasePrice(
              enteredPrice,
              manualPriceMode as ManualPriceMode,
              pricingPolicy,
            )
          : enteredPrice;
        subtotal += price * item.quantity;

        orderItems.push({
          variantId: item.variantId,
          quantity: item.quantity,
          price,
        });

        if (hasManualPriceChange && currentAccountPayment) {
          manualPriceChanges.push({
            variantId: item.variantId,
            productTitle: variant.product?.title || `Variante #${item.variantId}`,
            quantity: item.quantity,
            catalogPrice: this.roundCurrency(catalogPrice),
            enteredPrice,
            cardPrice: price,
            cashPrice: this.resolveManualSaleCashPrice(price, pricingPolicy),
          });
        }

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
        orderItems,
        pricingPolicy,
      );
      const total = Math.max(subtotal - discountAmount + shippingCost, 0);
      const requestedCreditAmount = this.roundCurrency(
        Math.max(Number(data.appliedCurrentAccountCreditAmount ?? 0), 0),
      );
      let appliedCreditAmount = 0;
      let selectedCurrentAccount: CurrentAccount | null = null;

      if (requestedCreditAmount > 0) {
        if (!data.customerId) {
          throw new BadRequestException(
            'Para usar saldo a favor, selecciona una cuenta corriente.',
          );
        }

        selectedCurrentAccount = await tx.currentAccount.findFirst({
          where: {
            storeId,
            customerId,
            storeLocationId: cashContext.storeLocationId,
            deletedAt: null,
          },
        });

        if (!selectedCurrentAccount) {
          throw new BadRequestException(
            'No encontramos una cuenta corriente activa para usar el saldo a favor.',
          );
        }

        const availableCredit = Math.abs(Math.min(Number(selectedCurrentAccount.balance), 0));
        appliedCreditAmount = Math.min(requestedCreditAmount, availableCredit, total);

        if (appliedCreditAmount <= 0) {
          throw new BadRequestException(
            'La cuenta corriente seleccionada no tiene saldo a favor disponible.',
          );
        }
      }

      const amountToCollect = this.roundCurrency(Math.max(total - appliedCreditAmount, 0));
      const paymentEntries = data.payments?.length
        ? data.payments.map((payment) => ({
            method: payment.method?.trim() || 'Efectivo',
            amount: this.roundCurrency(Math.max(Number(payment.amount ?? 0), 0)),
          }))
        : [
            {
              method: data.paymentMethod?.trim() || 'Efectivo',
              amount: amountToCollect,
            },
          ];
      const paymentMethodKeys = paymentEntries.map((payment) =>
        normalizeAdministrativePaymentMethod(payment.method),
      );
      const uniquePaymentMethodKeys = new Set(paymentMethodKeys);

      if (uniquePaymentMethodKeys.size !== paymentMethodKeys.length) {
        throw new BadRequestException(
          'No se puede repetir el mismo metodo en pagos divididos.',
        );
      }

      const paymentEntriesTotal = this.roundCurrency(
        paymentEntries.reduce((sum, payment) => sum + payment.amount, 0),
      );

      if (Math.abs(paymentEntriesTotal - amountToCollect) > 0.01) {
        throw new BadRequestException(
          'La suma de los pagos debe coincidir con el total a cobrar.',
        );
      }

      const currentAccountAmount = this.roundCurrency(
        paymentEntries
          .filter((payment) => this.isCurrentAccountPaymentMethod(payment.method))
          .reduce((sum, payment) => sum + payment.amount, 0),
      );
      const manualPriceComment = this.buildManualPriceComment(
        manualPriceChanges,
        manualPriceMode,
      );
      const manualPriceMetadata = manualPriceChanges.length
        ? {
            manualPriceMode,
            manualPriceChanges: manualPriceChanges.map((change) => ({
              variantId: change.variantId,
              productTitle: change.productTitle,
              quantity: change.quantity,
              catalogPrice: change.catalogPrice,
              enteredPrice: change.enteredPrice,
              cardPrice: change.cardPrice,
              cashPrice: change.cashPrice,
            })),
          }
        : {};
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
      const paymentStatus =
        currentAccountAmount > 0
          ? 'pending'
          : data.paymentStatus ?? 'approved';
      const stockStatus = currentAccountAmount > 0 ? 'approved' : paymentStatus;
      const initialOrderStatus =
        currentAccountAmount > 0
          ? OrderStatus.pending
          : stockStatus === 'approved'
            ? OrderStatus.paid
            : OrderStatus.pending;

      const order = await tx.order.create({
        data: {
          storeId,
          storeLocationId: cashContext.storeLocationId,
          cashRegisterId: cashContext.cashRegisterId,
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
            create: paymentEntries.map((payment, index) => {
              const entryCurrentAccount = this.isCurrentAccountPaymentMethod(payment.method);

              return {
                storeId,
                storeLocationId: cashContext.storeLocationId,
                cashRegisterId: cashContext.cashRegisterId,
                provider: 'manual',
                method: payment.method,
                status: entryCurrentAccount ? 'pending' : data.paymentStatus ?? 'approved',
                amount: payment.amount,
                reference: data.reference?.trim() || null,
                notes: data.notes?.trim() || null,
                metadata: {
                  origin: 'manual_sale',
                  discountType: discount.type,
                  discountValue: discount.value,
                  currentAccount: entryCurrentAccount,
                  splitPayment: paymentEntries.length > 1,
                  splitPaymentIndex: index + 1,
                  appliedCurrentAccountCreditAmount: index === 0 ? appliedCreditAmount : 0,
                  collectedAmount: payment.amount,
                  ...manualPriceMetadata,
                },
              };
            }),
          },
        },
        include: this.orderInclude(),
      });

      if (stockStatus === 'approved') {
        for (const item of orderItems) {
          await this.inventoryLockService.confirmStockTx(
            tx,
            storeId,
            item.variantId,
            item.quantity,
          );
        }
      }

      if (appliedCreditAmount > 0 && selectedCurrentAccount) {
        const previousCreditBalance = Number(selectedCurrentAccount.balance);
        const nextCreditBalance = this.roundCurrency(previousCreditBalance + appliedCreditAmount);
        const updatedAccount = await tx.currentAccount.update({
          where: { id: selectedCurrentAccount.id },
          data: {
            balance: nextCreditBalance,
            lastMovementAt: new Date(),
          },
        });

        await tx.currentAccountMovement.create({
          data: {
            storeId,
            storeLocationId: cashContext.storeLocationId,
            accountId: updatedAccount.id,
            customerId,
            orderId: order.id,
            cashRegisterId: cashContext.cashRegisterId,
            type: 'ADJUSTMENT_POSITIVE',
            amount: appliedCreditAmount,
            paymentMethod: 'Saldo a favor',
            description: `Saldo a favor usado en venta manual #${order.id}`,
            createdByUserId,
            balanceAfter: nextCreditBalance,
          },
        });
      }

      if (currentAccountAmount > 0) {
        await tx.customer.update({
          where: { id: customerId },
          data: { source: 'current_account' },
        });

        const existingAccount = await tx.currentAccount.findFirst({
          where: {
            storeId,
            customerId,
            storeLocationId: cashContext.storeLocationId,
          },
        });
        const previousBalance = Number(existingAccount?.balance ?? 0);
        const nextBalance = this.roundCurrency(previousBalance + currentAccountAmount);
        const account = existingAccount
          ? await tx.currentAccount.update({
              where: { id: existingAccount.id },
              data: {
                balance: nextBalance,
                ...(cashContext.storeLocationId && !existingAccount.storeLocationId
                  ? { storeLocationId: cashContext.storeLocationId }
                  : {}),
                lastMovementAt: new Date(),
                deletedAt: null,
              },
            })
          : await tx.currentAccount.create({
              data: {
                storeId,
                storeLocationId: cashContext.storeLocationId,
                customerId,
                balance: nextBalance,
                lastMovementAt: new Date(),
              },
            });

        await tx.currentAccountMovement.create({
          data: {
            storeId,
            storeLocationId: cashContext.storeLocationId,
            accountId: account.id,
            customerId,
            orderId: order.id,
            cashRegisterId: cashContext.cashRegisterId,
            type: 'SALE',
            amount: currentAccountAmount,
            paymentMethod: 'Cuenta corriente',
            description: [`Venta manual #${order.id}`, manualPriceComment]
              .filter(Boolean)
              .join('. '),
            createdByUserId,
            balanceAfter: nextBalance,
          },
        });
      }

      await tx.orderEvent.create({
        data: {
          storeId,
          orderId: order.id,
          type: 'order.manual_sale_created',
          title: 'Venta manual creada',
          message: 'El pedido fue creado desde el panel administrativo.',
          actorType: 'admin',
          metadata: {
            paymentStatus,
            paymentMethod: paymentEntries.map((payment) => payment.method).join(' + '),
            currentAccount: currentAccountAmount > 0,
            splitPayment: paymentEntries.length > 1,
            hasNotes: Boolean(data.notes?.trim()),
            ...manualPriceMetadata,
          },
        },
      });

      return this.withCancellationRequests(order);
    });
  }

  async updateManualSale(
    orderId: number,
    data: UpdateManualSaleDto,
    storeId: number,
    createdByUserId?: number,
  ) {
    await this.ensureManualSalesEnabled(storeId);
    await this.ensureManualCorrectionAllowed(storeId, createdByUserId);
    const pricingPolicy = await this.resolvePricingPolicy(storeId);
    const correctionReason = data.reason?.trim() || 'Sin motivo informado';

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

      if (order.cashRegisterId) {
        const correctionSession = await tx.cashRegisterSession.findUnique({
          where: { id: order.cashRegisterId },
          select: { closedAt: true },
        });
        if (correctionSession?.closedAt) {
          throw new BadRequestException(
            'La venta no se puede editar porque la caja asociada ya esta cerrada.',
          );
        }
      }

      const manualPayments = order.payments.filter(
        (payment) => payment.provider === 'manual',
      );
      const manualPayment = manualPayments[0];
      const previousCurrentAccountAmount = this.roundCurrency(
        manualPayments
          .filter((payment) =>
            this.isCurrentAccountPaymentMethod(payment.method) ||
            this.isCurrentAccountPaymentMetadata(payment.metadata),
          )
          .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0),
      );
      const behavesAsPending =
        previousCurrentAccountAmount <= 0 &&
        (manualPayment?.status === 'pending' || order.status === OrderStatus.pending);

      const incomingItems = data.items ?? order.items.map((item) => ({
        orderItemId: item.id,
        quantity: item.quantity,
        price: Number(item.price),
      }));
      const incomingNewItems = data.newItems ?? [];
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
      const discountItems: OrderItemData[] = [];
      const previousItemsSnapshot = order.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        price: Number(item.price),
      }));

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
        discountItems.push({
          variantId: existingItem.variantId,
          quantity: nextItem.quantity,
          price: Number(nextItem.price),
        });
      }

      for (const newItem of incomingNewItems) {
        const inventory = await tx.inventory.findUnique({
          where: {
            storeId_variantId: {
              storeId,
              variantId: newItem.variantId,
            },
          },
        });

        if (!inventory) {
          throw new NotFoundException(
            `Inventory missing for variant ${newItem.variantId}`,
          );
        }

        const available = inventory.quantity - inventory.reserved;

        if (available < newItem.quantity) {
          throw new BadRequestException(
            `Not enough stock for variant ${newItem.variantId}`,
          );
        }

        if (behavesAsPending) {
          await tx.inventory.update({
            where: {
              storeId_variantId: {
                storeId,
                variantId: newItem.variantId,
              },
            },
            data: {
              reserved: {
                increment: newItem.quantity,
              },
            },
          });
        } else {
          await tx.inventory.update({
            where: {
              storeId_variantId: {
                storeId,
                variantId: newItem.variantId,
              },
            },
            data: {
              quantity: {
                decrement: newItem.quantity,
              },
            },
          });
        }

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            variantId: newItem.variantId,
            quantity: newItem.quantity,
            price: newItem.price,
          },
        });

        subtotal += newItem.quantity * Number(newItem.price);
        discountItems.push({
          variantId: newItem.variantId,
          quantity: newItem.quantity,
          price: Number(newItem.price),
        });
      }

      const discount = this.resolveManualSaleDiscount({
        discountType: data.discountType,
        discountValue: data.discountValue,
      }, order.payments.find((payment) => payment.provider === 'manual')?.metadata);
      const discountAmount = this.calculateManualSaleDiscountAmount(
        subtotal,
        discount.type,
        discount.value,
        discountItems,
        pricingPolicy,
      );
      const total = Math.max(
        subtotal - discountAmount + Number(order.shippingCost ?? 0),
        0,
      );
      const manualPaymentMetadata = manualPayment?.metadata as Record<string, unknown> | null;
      const appliedCurrentAccountCreditAmount = this.roundCurrency(
        Math.max(Number(manualPaymentMetadata?.appliedCurrentAccountCreditAmount ?? 0), 0),
      );
      if (appliedCurrentAccountCreditAmount - total > 0.01) {
        throw new BadRequestException(
          'El nuevo total no puede ser menor que el saldo a favor aplicado originalmente.',
        );
      }
      const amountToCollect = this.roundCurrency(
        Math.max(total - appliedCurrentAccountCreditAmount, 0),
      );
      const paymentEntries = data.payments?.length
        ? data.payments.map((payment) => ({
            method: payment.method?.trim() || 'Efectivo',
            amount: this.roundCurrency(Math.max(Number(payment.amount ?? 0), 0)),
          }))
        : [{
            method: data.paymentMethod?.trim() || manualPayment?.method || 'Efectivo',
            amount: amountToCollect,
          }];
      const paymentMethodKeys = paymentEntries.map((payment) =>
        normalizeAdministrativePaymentMethod(payment.method),
      );

      if (new Set(paymentMethodKeys).size !== paymentMethodKeys.length) {
        throw new BadRequestException(
          'No se puede repetir el mismo metodo en pagos divididos.',
        );
      }

      const paymentEntriesTotal = this.roundCurrency(
        paymentEntries.reduce((sum, payment) => sum + payment.amount, 0),
      );

      if (Math.abs(paymentEntriesTotal - amountToCollect) > 0.01) {
        throw new BadRequestException(
          'La suma de los pagos debe coincidir con el total a cobrar.',
        );
      }

      const nextCurrentAccountAmount = this.roundCurrency(
        paymentEntries
          .filter((payment) => this.isCurrentAccountPaymentMethod(payment.method))
          .reduce((sum, payment) => sum + payment.amount, 0),
      );
      const nextCurrentAccountPayment = nextCurrentAccountAmount > 0;
      const nextPaymentMethod = paymentEntries.map((payment) => payment.method).join(' + ');

      if (
        nextCurrentAccountPayment &&
        (
          order.customerEmailSnapshot?.startsWith(`manual-sale@store-${storeId}.local`) ||
          order.customer?.email?.startsWith(`manual-sale@store-${storeId}.local`)
        )
      ) {
        throw new BadRequestException(
          'Para vender en cuenta corriente, selecciona o registra un cliente.',
        );
      }
      const previousTotal = Number(order.total);
      const nextOrderStatus = nextCurrentAccountPayment
        ? OrderStatus.pending
        : total > 0
          ? OrderStatus.paid
          : OrderStatus.paid;

      for (let index = 0; index < paymentEntries.length; index += 1) {
        const entry = paymentEntries[index];
        const existingPayment = manualPayments[index];
        const entryCurrentAccount = this.isCurrentAccountPaymentMethod(entry.method);
        const metadata = {
          ...((existingPayment?.metadata ?? manualPayment?.metadata) as Record<string, unknown> | null),
          origin: 'manual_sale',
          discountType: discount.type,
          discountValue: discount.value,
          currentAccount: entryCurrentAccount,
          splitPayment: paymentEntries.length > 1,
          splitPaymentIndex: index + 1,
          appliedCurrentAccountCreditAmount:
            index === 0 ? appliedCurrentAccountCreditAmount : 0,
          reclassifiedAt: new Date().toISOString(),
          reclassifiedByUserId: createdByUserId ?? null,
          correctionReason,
        };

        if (existingPayment) {
          await tx.payment.update({
            where: { id: existingPayment.id },
            data: {
              amount: entry.amount,
              method: entry.method,
              status: entryCurrentAccount ? 'pending' : 'approved',
              metadata,
            },
          });
        } else {
          await tx.payment.create({
            data: {
              storeId,
              storeLocationId: order.storeLocationId,
              cashRegisterId: order.cashRegisterId,
              orderId: order.id,
              provider: 'manual',
              method: entry.method,
              status: entryCurrentAccount ? 'pending' : 'approved',
              amount: entry.amount,
              reference: manualPayment?.reference ?? null,
              notes: manualPayment?.notes ?? null,
              metadata,
            },
          });
        }
      }

      if (manualPayments.length > paymentEntries.length) {
        await tx.payment.deleteMany({
          where: {
            id: { in: manualPayments.slice(paymentEntries.length).map((payment) => payment.id) },
          },
        });
      }

      const updated = await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          subtotal,
          discountAmount,
          total,
          status: nextOrderStatus,
        },
        include: this.orderInclude(),
      });

      const currentAccountDelta = this.roundCurrency(
        nextCurrentAccountAmount - previousCurrentAccountAmount,
      );

      if (currentAccountDelta !== 0) {
        let account = await tx.currentAccount.findFirst({
          where: {
            storeId,
            customerId: order.customerId,
            storeLocationId: order.storeLocationId,
          },
        });

        if (!account && nextCurrentAccountAmount > 0) {
          account = await tx.currentAccount.create({
            data: {
              storeId,
              storeLocationId: order.storeLocationId,
              customerId: order.customerId,
              balance: 0,
              lastMovementAt: new Date(),
            },
          });
        }

        if (account) {
          const nextBalance = this.roundCurrency(
            Number(account.balance) + currentAccountDelta,
          );

          await tx.currentAccount.update({
            where: { id: account.id },
            data: {
              balance: nextBalance,
              lastMovementAt: new Date(),
            },
          });

          await tx.currentAccountMovement.create({
            data: {
              storeId,
              storeLocationId: order.storeLocationId,
              accountId: account.id,
              customerId: order.customerId,
              orderId: order.id,
              type: currentAccountDelta >= 0 ? 'ADJUSTMENT_POSITIVE' : 'ADJUSTMENT_NEGATIVE',
              amount: currentAccountDelta,
              paymentMethod: 'Cuenta corriente',
              description:
                `Correccion de venta manual #${order.id}: ${correctionReason}. ` +
                `Metodo: ${manualPayment?.method ?? 'sin metodo'} -> ${nextPaymentMethod}.`,
              createdByUserId,
              balanceAfter: nextBalance,
            },
          });
        }
      }

      await tx.orderEvent.create({
        data: {
          storeId,
          orderId: order.id,
          type: 'order.manual_sale_corrected',
          title: 'Venta manual corregida',
          message: correctionReason,
          actorType: 'admin',
          actorId: createdByUserId,
          metadata: {
            previousTotal,
            nextTotal: total,
            previousPaymentMethod: manualPayments.map((payment) => payment.method).join(' + ') || null,
            nextPaymentMethod,
            previousPayments: manualPayments.map((payment) => ({
              method: payment.method,
              amount: Number(payment.amount),
            })),
            nextPayments: paymentEntries,
            previousCurrentAccountAmount,
            nextCurrentAccountAmount,
            currentAccountDelta,
            previousItems: previousItemsSnapshot,
            nextItems: [
              ...incomingItems.map((item) => ({
                orderItemId: item.orderItemId,
                quantity: item.quantity,
                price: item.price,
              })),
              ...incomingNewItems.map((item) => ({
                variantId: item.variantId,
                quantity: item.quantity,
                price: item.price,
                new: true,
              })),
            ],
          },
        },
      });

      return this.withCancellationRequests(updated);
    });
  }

  async cancelManualSale(
    orderId: number,
    storeId: number,
    createdByUserId?: number,
  ) {
    await this.ensureManualSalesEnabled(storeId);
    await this.ensureManualCorrectionAllowed(storeId, createdByUserId);

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
        return this.withCancellationRequests(order);
      }

      const manualPayment = order.payments.find(
        (payment) => payment.provider === 'manual',
      );
      const currentAccountPayment =
        order.payments.some((payment) => this.isCurrentAccountPaymentMetadata(payment.metadata));
      const currentAccountPaymentAmount = this.roundCurrency(
        order.payments
          .filter((payment) => this.isCurrentAccountPaymentMetadata(payment.metadata))
          .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0),
      );
      const behavesAsPending =
        !currentAccountPayment &&
        (manualPayment?.status === 'pending' ||
          order.status === OrderStatus.pending);

      for (const item of order.items) {
        if (behavesAsPending) {
          await this.inventoryLockService.releaseStockTx(
            tx,
            storeId,
            item.variantId,
            item.quantity,
          );
        } else {
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
      }

      const updated = await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: OrderStatus.cancelled,
          payments: order.payments.length
            ? {
                updateMany: {
                  where: {
                    provider: 'manual',
                  },
                  data: {
                    status: 'cancelled',
                    reviewedAt: new Date(),
                  },
                },
              }
            : undefined,
        },
        include: this.orderInclude(),
      });

      if (currentAccountPayment) {
        const account = await tx.currentAccount.findFirst({
          where: {
            storeId,
            customerId: order.customerId,
            storeLocationId: order.storeLocationId,
          },
        });

        if (account) {
          const nextBalance = this.roundCurrency(
            Number(account.balance) - currentAccountPaymentAmount,
          );

          await tx.currentAccount.update({
            where: { id: account.id },
            data: {
              balance: nextBalance,
              lastMovementAt: new Date(),
            },
          });

          await tx.currentAccountMovement.create({
            data: {
              storeId,
              storeLocationId: order.storeLocationId,
              accountId: account.id,
              customerId: order.customerId,
              orderId: order.id,
              type: 'ADJUSTMENT_NEGATIVE',
              amount: -currentAccountPaymentAmount,
              paymentMethod: 'Cuenta corriente',
              description: `Anulacion de venta manual #${order.id}`,
              createdByUserId,
              balanceAfter: nextBalance,
            },
          });
        }
      }

      await tx.orderEvent.create({
        data: {
          storeId,
          orderId: order.id,
          type: 'order.manual_sale_cancelled',
          title: 'Venta manual cancelada',
          message: 'La venta manual fue cancelada y el stock fue restituido.',
          actorType: 'admin',
          metadata: {
            previousStatus: order.status,
            paymentStatus: manualPayment?.status ?? null,
            restoredItems: order.items.map((item) => ({
              variantId: item.variantId,
              quantity: item.quantity,
            })),
          },
        },
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

  private async ensureManualCorrectionAllowed(storeId: number, userId?: number) {
    if (!userId) {
      throw new ForbiddenException('Only ADMIN and OWNER can correct manual sales');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, storeId },
      select: { role: true },
    });

    if (!['ADMIN', 'OWNER', 'SUPER_ADMIN'].includes(String(user?.role))) {
      throw new ForbiddenException('Only ADMIN and OWNER can correct manual sales');
    }
  }

  private async resolveManualSaleCashContext(
    storeId: number,
    userId?: number,
    requestedStoreLocationId?: number,
  ) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { cashRegisterMode: true },
    });
    const location = await this.resolveUserLocation(storeId, userId, requestedStoreLocationId);

    if (store?.cashRegisterMode !== 'manual') {
      const session = await this.ensureAutomaticCashRegisterSession(
        storeId,
        location?.id ?? null,
      );

      return {
        storeLocationId: location?.id ?? null,
        cashRegisterId: session.id,
      };
    }

    if (!location) {
      throw new BadRequestException(
        'Asigna este usuario a un local fisico antes de registrar ventas manuales.',
      );
    }

    const session = await this.prisma.cashRegisterSession.findFirst({
      where: {
        storeId,
        storeLocationId: location.id,
        mode: 'manual',
        closedAt: null,
      },
      select: { id: true },
      orderBy: { openedAt: 'desc' },
    });

    if (!session) {
      throw new BadRequestException(
        `No hay una caja abierta para ${location.name}. Un encargado debe abrirla antes de vender.`,
      );
    }

    return {
      storeLocationId: location.id,
      cashRegisterId: session.id,
    };
  }

  private async ensureAutomaticCashRegisterSession(
    storeId: number,
    storeLocationId: number | null,
  ) {
    const { start } = this.getBuenosAiresDayRange(new Date());
    const existing = await this.prisma.cashRegisterSession.findFirst({
      where: {
        storeId,
        storeLocationId,
        mode: 'automatic',
        businessDate: start,
      },
      select: { id: true },
      orderBy: { openedAt: 'desc' },
    });

    if (existing) return existing;

    return this.prisma.cashRegisterSession.create({
      data: {
        storeId,
        storeLocationId,
        mode: 'automatic',
        businessDate: start,
        openingAmount: 0,
        openedAt: start,
      },
      select: { id: true },
    });
  }

  private getBuenosAiresDayRange(date: Date) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(date).map((part) => [part.type, part.value]),
    );
    const year = Number(parts.year);
    const month = Number(parts.month);
    const day = Number(parts.day);
    const start = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  private async resolveUserLocation(
    storeId: number,
    userId?: number,
    requestedStoreLocationId?: number,
  ) {
    if (!userId) {
      return null;
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, storeId },
      select: {
        role: true,
        storeLocation: {
          select: {
            id: true,
            name: true,
            active: true,
          },
        },
      },
    });

    if (requestedStoreLocationId && ['OWNER', 'ADMIN', 'SUPER_ADMIN'].includes(String(user?.role))) {
      const requested = await this.prisma.storeLocation.findFirst({
        where: { id: requestedStoreLocationId, storeId, active: true },
        select: { id: true, name: true, active: true },
      });

      if (!requested) {
        throw new BadRequestException('El local seleccionado no existe o esta inactivo.');
      }

      return requested;
    }

    return user?.storeLocation?.active ? user.storeLocation : null;
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
          payments: true,
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

      const isPickupOrder = this.isPickupOrder({
        shippingMethod: order.shippingMethod,
        shippingProvider: order.shippingProvider,
      });

      const cashOnPickupOrder = this.isCashOnPickupOrder(order, isPickupOrder);
      const requiresShipping = !isPickupOrder;
      const validTransitions = this.validStatusTransitions(isPickupOrder, cashOnPickupOrder);
      const allowed = validTransitions[order.status] ?? [];

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

      if (status === OrderStatus.paid) {
        await this.reconcilePaymentForPaidStatus(tx, order, isPickupOrder);

        for (const item of order.items) {
          await this.inventoryLockService.confirmStockTx(
            tx,
            storeId,
            item.variantId,
            item.quantity,
          );
        }
      }

      if (status === OrderStatus.picked_up && cashOnPickupOrder) {
        await this.reconcilePaymentForPaidStatus(tx, order, isPickupOrder);

        for (const item of order.items) {
          await this.inventoryLockService.confirmStockTx(
            tx,
            storeId,
            item.variantId,
            item.quantity,
          );
        }
      }

      if (
        (status === 'processing' || status === 'packed') &&
        requiresShipping &&
        !order.shipment
      ) {
        this.buildShippingAddress(order);

        if (!order.shippingPostalCodeSnapshot?.trim()) {
          throw new BadRequestException(
            'Shipping postal code snapshot is required before preparing this order',
          );
        }

        shouldProvisionShipment = true;
      }

      if (status === 'shipped' && requiresShipping) {
        if (!order.shipment) {
          this.buildShippingAddress(order);

          if (!order.shippingPostalCodeSnapshot?.trim()) {
            throw new BadRequestException(
              'Shipping postal code snapshot is required before dispatching this order',
            );
          }

          shouldProvisionShipment = true;
        }

        if (order.shipment && this.requiresManualTrackingForDispatch(order)) {
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
      }).then(async (updatedOrder) => {
        await tx.orderEvent.create({
          data: {
            storeId,
            orderId,
            type: 'order.status_changed',
            title: `Estado actualizado: ${this.orderStatusLabel(status)}`,
            message: `El pedido paso de ${this.orderStatusLabel(order.status)} a ${this.orderStatusLabel(status)}.`,
            actorType: 'admin',
            metadata: {
              from: order.status,
              to: status,
              pickupOrder: isPickupOrder,
              cashOnPickupOrder,
            },
          },
        });

        return updatedOrder;
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

  private async reconcilePaymentForPaidStatus(
    tx: any,
    order: {
      id: number;
      storeId: number;
      total: any;
      payments?: Array<{
        id: number;
        provider: string;
        method?: string | null;
        status: string;
      }>;
    },
    isPickupOrder: boolean,
  ) {
    const payments = order.payments ?? [];
    const approvedPayment = payments.find(
      (payment) => payment.status.trim().toLowerCase() === 'approved',
    );

    if (approvedPayment) {
      return;
    }

    const pendingCashPayment = payments.find((payment) => {
      const provider = payment.provider.trim().toLowerCase();
      const method = payment.method?.trim().toLowerCase() ?? '';

      return (
        payment.status.trim().toLowerCase() === 'pending' &&
        (provider === 'cash' ||
          method === 'cash' ||
          method === 'cash_on_pickup' ||
          method === 'efectivo')
      );
    });

    if (pendingCashPayment) {
      await tx.payment.update({
        where: { id: pendingCashPayment.id },
        data: {
          status: 'approved',
          reviewedAt: new Date(),
        },
      });
      return;
    }

    const pendingOfflinePayment = payments.find((payment) => {
      const provider = payment.provider.trim().toLowerCase();
      const method = payment.method?.trim().toLowerCase() ?? '';

      return (
        payment.status.trim().toLowerCase() === 'pending' &&
        (provider === 'bank_transfer' ||
          provider === 'transfer' ||
          provider === 'transferencia' ||
          method === 'bank_transfer' ||
          method === 'transfer' ||
          method === 'transferencia')
      );
    });

    if (pendingOfflinePayment) {
      await tx.payment.update({
        where: { id: pendingOfflinePayment.id },
        data: {
          status: 'approved',
          reviewedAt: new Date(),
        },
      });

      await tx.orderEvent.create({
        data: {
          storeId: order.storeId,
          orderId: order.id,
          type: 'payment.approved',
          title: 'Pago aprobado',
          message: 'El pago fue aprobado al confirmar el pedido como pagado.',
          actorType: 'admin',
          metadata: {
            paymentId: pendingOfflinePayment.id,
            provider: pendingOfflinePayment.provider,
            previousStatus: pendingOfflinePayment.status,
            status: 'approved',
            source: 'admin_status_transition',
          },
        },
      });

      return;
    }

    if (payments.length === 0 && isPickupOrder) {
      await tx.payment.create({
        data: {
          storeId: order.storeId,
          orderId: order.id,
          provider: 'cash',
          method: 'cash',
          status: 'approved',
          amount: order.total,
          reviewedAt: new Date(),
          metadata: {
            source: 'admin_status_transition',
            channel: 'cash_on_pickup',
            recoveredMissingPayment: true,
          },
        },
      });
      return;
    }

    throw new BadRequestException(
      'Cannot mark order as paid without an approved payment',
    );
  }

  private isCashOnPickupOrder(
    order: {
      payments?: Array<{
        provider: string;
        method?: string | null;
        status: string;
      }>;
    },
    pickupOrder: boolean,
  ) {
    if (!pickupOrder) {
      return false;
    }

    return (order.payments ?? []).some((payment) => {
      const provider = payment.provider.trim().toLowerCase();
      const method = payment.method?.trim().toLowerCase() ?? '';
      const status = payment.status.trim().toLowerCase();

      return (
        status === 'pending' &&
        (provider === 'cash' ||
          method === 'cash' ||
          method === 'cash_on_pickup' ||
          method === 'efectivo')
      );
    });
  }

  private validStatusTransitions(pickupOrder: boolean, cashOnPickupOrder = false) {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      pending: cashOnPickupOrder ? ['processing', 'cancelled'] : ['cancelled', 'paid'],
      paid: pickupOrder ? ['processing', 'ready_for_pickup', 'cancelled'] : ['processing', 'cancelled'],
      processing: ['packed', 'cancelled'],
      packed: pickupOrder ? ['ready_for_pickup'] : ['shipped'],
      ready_for_pickup: ['picked_up'],
      picked_up: [],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
      refunded: [],
    };

    return transitions;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cancelExpiredPendingOrders() {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.pending,
        OR: [
          {
            reservationExpiresAt: {
              lt: new Date(),
            },
          },
          {
            reservationExpiresAt: null,
            createdAt: {
              lt: cutoff,
            },
          },
        ],
        payments: {
          none: {
            status: {
              in: ['approved', 'paid'],
            },
          },
        },
      },
      select: {
        id: true,
        storeId: true,
        items: {
          select: {
            variantId: true,
            quantity: true,
          },
        },
      },
      take: 50,
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!expiredOrders.length) {
      return;
    }

    for (const order of expiredOrders) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const current = await tx.order.findFirst({
            where: {
              id: order.id,
              status: OrderStatus.pending,
            },
            include: {
              items: true,
              payments: true,
            },
          });

          if (!current) {
            return;
          }

          const hasApprovedPayment = current.payments.some((payment) =>
            ['approved', 'paid'].includes(payment.status),
          );

          if (hasApprovedPayment) {
            return;
          }

          for (const item of current.items) {
            await this.inventoryLockService.releaseStockTx(
              tx,
              current.storeId,
              item.variantId,
              item.quantity,
            );
          }

          await tx.order.update({
            where: { id: current.id },
            data: {
              status: OrderStatus.cancelled,
            },
          });

          await tx.orderEvent.create({
            data: {
              storeId: current.storeId,
              orderId: current.id,
              type: 'order.expired',
              title: 'Reserva vencida',
              message: 'El pedido pendiente fue cancelado automaticamente y el stock reservado se libero.',
              actorType: 'system',
              metadata: {
                previousStatus: current.status,
                expiredAt: new Date().toISOString(),
              },
            },
          });
        });
      } catch (error) {
        this.logger.warn(
          `Could not expire pending order ${order.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
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

  async findManualSales(storeId: number, userId?: number, requestedStoreLocationId?: number) {
    const location = await this.resolveUserLocation(storeId, userId, requestedStoreLocationId);

    return this.prisma.order.findMany({
      where: {
        storeId,
        ...(location ? { storeLocationId: location.id } : {}),
        payments: {
          some: {
            provider: 'manual',
          },
        },
      },
      include: {
        ...this.orderInclude(),
        events: {
          where: {
            type: {
              in: [
                'order.manual_sale_corrected',
                'order.manual_sale_cancelled',
              ],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 8,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }).then((orders) => this.withCancellationRequestsList(orders));
  }

  async exportAccountingCsv(storeId: number, query: ExportAccountingDto) {
    const csvDelimiter = ';';
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
      'Detalle estado pago',
      'Monto pago',
      'Referencia externa',
      'Referencia interna',
      'Merchant order MP',
      'Cuotas',
      'Tipo pago MP',
      'Fecha aprobacion MP',
      'Fecha pago',
      'Fecha revision pago',
      'Cantidad refunds',
      'Monto refunds',
      'Fecha ultimo refund',
      'Proveedor envio',
      'Metodo envio',
      'Detalle pagos',
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
      const paymentStatusDetail =
        typeof paymentMetadata?.statusDetail === 'string'
          ? paymentMetadata.statusDetail
          : '';
      const paymentTypeId =
        typeof paymentMetadata?.paymentTypeId === 'string'
          ? paymentMetadata.paymentTypeId
          : '';
      const merchantOrderId =
        typeof paymentMetadata?.merchantOrderId === 'string'
          ? paymentMetadata.merchantOrderId
          : '';
      const dateApproved =
        typeof paymentMetadata?.dateApproved === 'string'
          ? paymentMetadata.dateApproved
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
        paymentStatusDetail,
        this.toMoneyValue(primaryPayment?.amount ?? null),
        primaryPayment?.externalId ?? '',
        primaryPayment?.reference ?? '',
        merchantOrderId,
        installments,
        paymentTypeId,
        dateApproved,
        this.toCsvDate(primaryPayment?.createdAt ?? null),
        this.toCsvDate(primaryPayment?.reviewedAt ?? null),
        order.refunds.length,
        refundAmount.toFixed(2),
        this.toCsvDate(lastRefund?.createdAt ?? null),
        order.shippingProvider ?? '',
        order.shippingMethod ?? '',
        order.payments
          .map((payment) => `${payment.method ?? payment.provider}: ${this.toMoneyValue(payment.amount)}`)
          .join(' + '),
      ]
        .map((value) => this.escapeCsv(value))
        .join(csvDelimiter);
    });

    const fromLabel = query.from?.trim() || 'inicio';
    const toLabel = query.to?.trim() || 'hoy';

    return {
      filename: `contable-store-${storeId}-${fromLabel}-${toLabel}.csv`,
      csv: `\uFEFFsep=${csvDelimiter}\n${[header.join(csvDelimiter), ...lines].join('\n')}`,
    };
  }

  async findOne(id: number, storeId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        storeId,
      },
      include: this.orderInclude(),
    });

    if (!order) {
      return order;
    }

    const synchronizedOrder = await this.refreshAutomaticShipmentIfNeeded(
      storeId,
      order,
    );

    const events = await this.prisma.orderEvent.findMany({
      where: {
        storeId,
        orderId: id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return this.withCancellationRequests({
      ...synchronizedOrder,
      events,
    });
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
        shippingMethod: true,
        shippingProvider: true,
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
          title: 'Compra confirmada',
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
                title: this.customerStatusTitle(
                  order.status,
                  this.isPickupOrder({
                    shippingMethod: order.shippingMethod,
                    shippingProvider: order.shippingProvider,
                  }),
                ),
                body: this.customerStatusBody(
                  order.status,
                  order.shipment?.trackingNumber,
                  this.isPickupOrder({
                    shippingMethod: order.shippingMethod,
                    shippingProvider: order.shippingProvider,
                  }),
                ),
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

    const synchronizedOrder = await this.refreshAutomaticShipmentIfNeeded(
      storeId,
      order,
    );

    return this.withCancellationRequests(synchronizedOrder);
  }

  async getAdminReceiptPdf(orderId: number, storeId: number) {
    const order = await this.findOrderForReceipt({
      orderId,
      storeId,
    });

    return {
      filename: `comprobante-pedido-${order.id}.pdf`,
      pdf: this.renderOrderReceiptPdf(order),
    };
  }

  async getCustomerReceiptPdf(orderId: number, storeId: number, customerId: number) {
    const order = await this.findOrderForReceipt({
      orderId,
      storeId,
      customerId,
    });

    const pickupOrder = this.isPickupOrder({
      shippingMethod: order.shippingMethod,
      shippingProvider: order.shippingProvider,
    });

    if (this.isCashOnPickupOrder(order, pickupOrder)) {
      throw new BadRequestException(
        'El comprobante se habilita cuando la compra esta cobrada y entregada.',
      );
    }

    return {
      filename: `comprobante-pedido-${order.id}.pdf`,
      pdf: this.renderOrderReceiptPdf(order),
    };
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
        source: 'admin',
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

  private orderStatusLabel(status: string) {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      paid: 'Pagado',
      processing: 'En preparacion',
      packed: 'Empacado',
      ready_for_pickup: 'Listo para retiro',
      picked_up: 'Retirado',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
      refunded: 'Reintegrado',
    };

    return labels[status] ?? status;
  }

  private paymentStatusReceiptLabel(status?: string | null) {
    const normalized = status?.trim().toLowerCase() ?? '';
    const labels: Record<string, string> = {
      pending: 'pendiente de confirmacion',
      approved: 'aprobado',
      paid: 'aprobado',
      rejected: 'rechazado',
      cancelled: 'cancelado',
      refunded: 'reintegrado',
      partially_refunded: 'parcialmente reintegrado',
    };

    return labels[normalized] ?? 'registrado';
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
    items: Array<Pick<OrderItemData, 'price' | 'quantity'>> = [],
    pricingPolicy: Pick<StorePricingPolicy, 'manualSaleDiscountRounding'>,
  ) {
    return calculateManualSaleDiscountAmount(
      subtotal,
      discountType,
      discountValue,
      items,
      pricingPolicy,
    );
  }

  private resolveManualSaleBasePrice(
    enteredPrice: number,
    manualPriceMode: ManualPriceMode,
    pricingPolicy: Pick<StorePricingPolicy, 'cashInput' | 'manualSaleDiscountRounding'>,
  ) {
    const safePrice = this.roundCurrency(enteredPrice);
    const multiplier = pricingPolicy.cashInput.enabled
      ? pricingPolicy.cashInput.multiplier
      : 1;

    if (manualPriceMode !== 'cash' || multiplier <= 0 || multiplier >= 1) {
      return safePrice;
    }

    const cardPrice = safePrice / multiplier;
    return pricingPolicy.manualSaleDiscountRounding
      ? roundToNearestHundred(cardPrice)
      : this.roundCurrency(cardPrice);
  }

  private resolveManualSaleCashPrice(
    cardPrice: number,
    pricingPolicy: Pick<StorePricingPolicy, 'cashInput' | 'manualSaleDiscountRounding'>,
  ) {
    if (!pricingPolicy.cashInput.enabled) {
      return this.roundCurrency(cardPrice);
    }

    const cashPrice = cardPrice * pricingPolicy.cashInput.multiplier;
    return pricingPolicy.manualSaleDiscountRounding
      ? this.roundCurrency(resolveLabelNormalPrice(cashPrice, { labelPriceRounding: true }))
      : this.roundCurrency(cashPrice);
  }

  private buildManualPriceComment(
    changes: ManualPriceChange[],
    manualPriceMode?: ManualPriceMode,
  ) {
    if (!changes.length || !manualPriceMode) {
      return '';
    }

    const modeLabel = manualPriceMode === 'cash' ? 'efectivo' : 'tarjeta';
    const detail = changes
      .map((change) => {
        const enteredLabel =
          manualPriceMode === 'cash'
            ? `manual efectivo ${this.formatMoney(change.enteredPrice)}`
            : `manual tarjeta ${this.formatMoney(change.enteredPrice)}`;
        const equivalentLabel =
          manualPriceMode === 'cash'
            ? `tarjeta calculada ${this.formatMoney(change.cardPrice)}`
            : `efectivo equivalente ${this.formatMoney(change.cashPrice)}`;

        return `${change.productTitle} x${change.quantity}: catalogo ${this.formatMoney(change.catalogPrice)}, ${enteredLabel}, ${equivalentLabel}`;
      })
      .join('; ');

    return `Precios manuales cargados como ${modeLabel}: ${detail}`;
  }

  private isCurrentAccountPaymentMethod(paymentMethod?: string | null) {
    const normalized = paymentMethod?.trim().toLowerCase() ?? '';
    return (
      normalized === 'cuenta corriente' ||
      normalized === 'current_account' ||
      normalized === 'current account'
    );
  }

  private isCurrentAccountPaymentMetadata(metadata: unknown) {
    return (
      Boolean(metadata) &&
      typeof metadata === 'object' &&
      (metadata as Record<string, unknown>).currentAccount === true
    );
  }

  private roundCurrency(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private async resolvePricingPolicy(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        domain: true,
        storefrontConfig: true,
        bankTransferDiscountPercentage: true,
      },
    });

    return resolveStorePricingPolicy(store);
  }

  private buildShippingAddress(order: {
    shippingAddress1Snapshot?: string | null;
    shippingAddress2Snapshot?: string | null;
    shippingCitySnapshot?: string | null;
    shippingStateSnapshot?: string | null;
  }) {
    const address = [
      order.shippingAddress1Snapshot,
      order.shippingAddress2Snapshot,
      order.shippingCitySnapshot,
      order.shippingStateSnapshot,
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
    shippingProvider?: string | null;
    shipment?: {
      provider?: string | null;
      carrier?: string | null;
    } | null;
  }) {
    const shippingMethod = order.shippingMethod?.trim().toLowerCase() ?? '';
    const shippingProvider = order.shippingProvider?.trim().toLowerCase() ?? '';
    const shipmentProvider = order.shipment?.provider?.trim().toLowerCase() ?? '';

    if (
      shippingMethod.includes('coordinar') ||
      shippingMethod.includes('retiro') ||
      shippingMethod.includes('pickup')
    ) {
      return false;
    }

    if (
      shippingProvider === 'correo-argentino' ||
      shippingProvider === 'enviopack' ||
      shipmentProvider === 'correo-argentino' ||
      shipmentProvider === 'enviopack'
    ) {
      return false;
    }

    return shippingProvider === 'manual' || shipmentProvider === 'manual' || !shipmentProvider;
  }

  private async findOrderForReceipt(options: {
    orderId: number;
    storeId: number;
    customerId?: number;
  }) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: options.orderId,
        storeId: options.storeId,
        ...(options.customerId ? { customerId: options.customerId } : {}),
      },
      include: {
        store: true,
        customer: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            document: true,
          },
        },
        items: {
          include: {
            variant: {
              include: {
                product: true,
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
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  private renderOrderReceiptPdf(
    order: Awaited<ReturnType<OrdersService['findOrderForReceipt']>>,
  ) {
    const pdf = new SimplePdfDocument();
    const margin = 42;
    const pageWidth = pdf.getPageWidth();
    const pageHeight = pdf.getPageHeight();
    const contentWidth = pageWidth - margin * 2;
    const rightEdge = pageWidth - margin;
    const storeName = order.store.name || 'Tienda';
    const issuedAt = new Date(order.createdAt);
    const customerEmail = order.customerEmailSnapshot || order.customer?.email || 'No informado';
    const customerPhone =
      order.shippingPhoneSnapshot || order.customerPhoneSnapshot || order.customer?.phone || 'No informado';
    const customerDocument = order.customer?.document || 'No informado';
    const customerName = this.orderCustomerLabel(order);
    const shippingAddress =
      [
        order.shippingAddress1Snapshot,
        order.shippingAddress2Snapshot,
        [order.shippingCitySnapshot, order.shippingStateSnapshot].filter(Boolean).join(', '),
        order.shippingPostalCodeSnapshot ? `CP ${order.shippingPostalCodeSnapshot}` : null,
      ]
        .filter(Boolean)
        .join(', ') || 'No informada';
    const payment = order.payments?.[0];
    const paymentLabel = payment
      ? 'Pago: ' + this.paymentStatusReceiptLabel(payment.status)
      : 'Pago pendiente';
    const receiptPricingPolicy = resolveStorePricingPolicy(order.store);
    const receiptItems = order.items.map((item) => {
      const unitPrice = receiptPricingPolicy.labelPriceRounding
        ? resolveLabelNormalPrice(Number(item.price), receiptPricingPolicy)
        : Number(item.price);

      return {
        ...item,
        receiptUnitPrice: unitPrice,
        receiptLineSubtotal: unitPrice * item.quantity,
      };
    });
    const receiptSubtotal = receiptPricingPolicy.labelPriceRounding
      ? receiptItems.reduce((sum, item) => sum + item.receiptLineSubtotal, 0)
      : Number(order.subtotal ?? 0);
    const receiptShippingCost = Number(order.shippingCost ?? 0);
    const receiptTotal = Number(order.total ?? 0);
    const receiptDiscountAmount = Math.max(
      receiptSubtotal + receiptShippingCost - receiptTotal,
      0,
    );

    const textWidth = (value: string, size: number) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim().length * size * 0.54;
    const drawRightText = (
      value: string,
      x: number,
      y: number,
      size = 10,
      font: 'Helvetica' | 'Helvetica-Bold' = 'Helvetica',
    ) => {
      pdf.drawText({ x: x - textWidth(value, size), y, text: value, size, font });
    };
    const drawLabelValue = (label: string, value: string, x: number, y: number, maxWidth: number) =>
      pdf.drawWrappedText({
        x,
        y,
        text: label + ': ' + value,
        maxWidth,
        size: 9.5,
        lineHeight: 13,
      });
    const drawSectionTitle = (value: string, x: number, y: number) => {
      pdf.drawText({ x, y, text: value, size: 9.5, font: 'Helvetica-Bold' });
      pdf.drawLine({ x1: x, y1: y - 5, x2: rightEdge, y2: y - 5, lineWidth: 0.8 });
    };

    let cursorY = pageHeight - 36;
    const ensureSpace = (requiredHeight: number, header = true) => {
      if (cursorY - requiredHeight >= 72) return;
      pdf.addPage();
      cursorY = pageHeight - 54;
      if (!header) return;

      pdf.drawText({
        x: margin,
        y: cursorY,
        text: storeName + ' - Comprobante de compra',
        size: 11,
        font: 'Helvetica-Bold',
      });
      drawRightText('Pedido #' + order.id, rightEdge, cursorY, 10, 'Helvetica-Bold');
      cursorY -= 22;
      pdf.drawLine({ x1: margin, y1: cursorY, x2: rightEdge, y2: cursorY, lineWidth: 0.8 });
      cursorY -= 22;
    };

    pdf.drawRect({ x: margin, y: cursorY - 24, width: contentWidth, height: 24, lineWidth: 1.2 });
    pdf.drawText({
      x: margin + contentWidth / 2 - textWidth('ORIGINAL', 14) / 2,
      y: cursorY - 17,
      text: 'ORIGINAL',
      size: 14,
      font: 'Helvetica-Bold',
    });

    cursorY -= 24;
    const leftBoxWidth = contentWidth / 2;
    const rightBoxWidth = contentWidth / 2;
    const headerHeight = 112;
    pdf.drawRect({ x: margin, y: cursorY - headerHeight, width: leftBoxWidth, height: headerHeight, lineWidth: 1.2 });
    pdf.drawRect({ x: margin + leftBoxWidth, y: cursorY - headerHeight, width: rightBoxWidth, height: headerHeight, lineWidth: 1.2 });
    const fiscalBox = {
      x: margin + leftBoxWidth - 34,
      y: cursorY - 58,
      width: 68,
      height: 48,
    };
    pdf.drawFilledRect({
      x: fiscalBox.x - 2,
      y: fiscalBox.y - 2,
      width: fiscalBox.width + 4,
      height: fiscalBox.height + 4,
      color: 'white',
    });
    pdf.drawRect({ ...fiscalBox, lineWidth: 1.2 });
    pdf.drawText({
      x: margin + leftBoxWidth - textWidth('C', 28) / 2,
      y: cursorY - 34,
      text: 'C',
      size: 28,
      font: 'Helvetica-Bold',
    });
    pdf.drawText({
      x: margin + leftBoxWidth - textWidth('NO FISCAL', 7) / 2,
      y: cursorY - 48,
      text: 'NO FISCAL',
      size: 7,
      font: 'Helvetica-Bold',
    });

    pdf.drawText({ x: margin + 18, y: cursorY - 26, text: storeName, size: 20, font: 'Helvetica-Bold' });
    pdf.drawWrappedText({
      x: margin + 18,
      y: cursorY - 50,
      text: ['Comprobante emitido por ' + storeName, 'Documento comercial no fiscal', 'Gracias por tu compra'].join('\n'),
      maxWidth: leftBoxWidth - 46,
      size: 9.5,
      lineHeight: 13,
    });

    pdf.drawText({ x: margin + leftBoxWidth + 52, y: cursorY - 26, text: 'COMPROBANTE', size: 20, font: 'Helvetica-Bold' });
    pdf.drawWrappedText({
      x: margin + leftBoxWidth + 52,
      y: cursorY - 50,
      text: [
        'Pedido: #' + order.id,
        'Fecha: ' + issuedAt.toLocaleDateString('es-AR'),
        'Hora: ' + issuedAt.toLocaleTimeString('es-AR'),
        'Estado: ' + this.orderStatusLabel(order.status),
      ].join('\n'),
      maxWidth: rightBoxWidth - 70,
      size: 9.5,
      lineHeight: 13,
    });

    cursorY -= headerHeight + 10;

    const periodHeight = 30;
    pdf.drawRect({ x: margin, y: cursorY - periodHeight, width: contentWidth, height: periodHeight, lineWidth: 1 });
    pdf.drawText({ x: margin + 12, y: cursorY - 19, text: 'Fecha de compra: ' + issuedAt.toLocaleDateString('es-AR'), size: 9, font: 'Helvetica-Bold' });
    pdf.drawText({ x: margin + 205, y: cursorY - 19, text: 'Entrega: ' + (order.shippingMethod || 'A confirmar'), size: 9, font: 'Helvetica-Bold' });
    drawRightText(
      order.reservationExpiresAt && order.status === OrderStatus.pending
        ? 'Reserva hasta: ' + new Date(order.reservationExpiresAt).toLocaleDateString('es-AR')
        : 'Reserva: confirmada',
      rightEdge - 12,
      cursorY - 19,
      9,
      'Helvetica-Bold',
    );

    cursorY -= periodHeight + 8;

    const customerBoxStartY = cursorY;
    pdf.drawRect({ x: margin, y: cursorY - 92, width: contentWidth, height: 92, lineWidth: 1 });
    pdf.drawText({ x: margin + 12, y: cursorY - 18, text: 'DATOS DEL COMPRADOR Y ENTREGA', size: 9.5, font: 'Helvetica-Bold' });
    let leftY = cursorY - 36;
    leftY = drawLabelValue('Cliente', customerName, margin + 12, leftY, 235);
    leftY = drawLabelValue('Email', customerEmail, margin + 12, leftY, 235);
    leftY = drawLabelValue('Telefono', customerPhone, margin + 12, leftY, 235);
    drawLabelValue('DNI', customerDocument, margin + 12, leftY, 235);
    let rightY = cursorY - 36;
    rightY = drawLabelValue('Entrega', order.shippingMethod || 'A confirmar', margin + 275, rightY, 230);
    rightY = drawLabelValue('Direccion', shippingAddress, margin + 275, rightY, 230);
    drawLabelValue('Tracking', order.shipment?.trackingNumber || 'Pendiente', margin + 275, rightY, 230);
    cursorY = customerBoxStartY - 104;

    if (order.customerNotesSnapshot) {
      ensureSpace(42);
      pdf.drawRect({ x: margin, y: cursorY - 38, width: contentWidth, height: 38, lineWidth: 0.8 });
      pdf.drawText({ x: margin + 12, y: cursorY - 16, text: 'NOTA DEL PEDIDO', size: 8.5, font: 'Helvetica-Bold' });
      pdf.drawWrappedText({ x: margin + 120, y: cursorY - 16, text: order.customerNotesSnapshot, maxWidth: contentWidth - 132, size: 9, lineHeight: 12 });
      cursorY -= 48;
    }

    ensureSpace(86);
    drawSectionTitle('DETALLE DE PRODUCTOS', margin, cursorY);
    cursorY -= 22;

    const tableTop = cursorY;
    const columns = { item: margin, product: margin + 46, qty: margin + 292, unit: margin + 346, discount: margin + 418, subtotal: margin + 458 };
    pdf.drawRect({ x: margin, y: tableTop - 24, width: contentWidth, height: 24, lineWidth: 1 });
    pdf.drawText({ x: columns.item + 6, y: tableTop - 16, text: 'Item', size: 8, font: 'Helvetica-Bold' });
    pdf.drawText({ x: columns.product + 6, y: tableTop - 16, text: 'Producto / Servicio', size: 8, font: 'Helvetica-Bold' });
    pdf.drawText({ x: columns.qty + 6, y: tableTop - 16, text: 'Cant.', size: 8, font: 'Helvetica-Bold' });
    pdf.drawText({ x: columns.unit + 6, y: tableTop - 16, text: 'Precio unit.', size: 8, font: 'Helvetica-Bold' });
    pdf.drawText({ x: columns.discount + 6, y: tableTop - 16, text: 'Bonif.', size: 8, font: 'Helvetica-Bold' });
    pdf.drawText({ x: columns.subtotal + 6, y: tableTop - 16, text: 'Subtotal', size: 8, font: 'Helvetica-Bold' });
    cursorY -= 24;

    receiptItems.forEach((item, index) => {
      ensureSpace(42);
      const rowHeight = 36;
      const rowY = cursorY;
      pdf.drawRect({ x: margin, y: rowY - rowHeight, width: contentWidth, height: rowHeight, lineWidth: 0.6 });
      pdf.drawText({ x: columns.item + 6, y: rowY - 15, text: String(index + 1), size: 8 });
      pdf.drawWrappedText({ x: columns.product + 6, y: rowY - 12, text: item.variant.product.title, maxWidth: 230, size: 8.5, lineHeight: 11 });
      drawRightText(String(item.quantity), columns.qty + 38, rowY - 15, 8.5);
      drawRightText(this.formatMoney(item.receiptUnitPrice), columns.unit + 62, rowY - 15, 8.5);
      drawRightText('0,00', columns.discount + 40, rowY - 15, 8.5);
      drawRightText(this.formatMoney(item.receiptLineSubtotal), rightEdge - 8, rowY - 15, 8.5, 'Helvetica-Bold');
      cursorY -= rowHeight;
    });

    ensureSpace(164, false);
    cursorY -= 18;
    const footerTop = cursorY;
    const leftFooterWidth = 275;
    const totalBoxWidth = contentWidth - leftFooterWidth - 14;
    pdf.drawRect({ x: margin, y: footerTop - 112, width: leftFooterWidth, height: 112, lineWidth: 1 });
    pdf.drawText({ x: margin + 12, y: footerTop - 18, text: 'INFORMACION ADICIONAL', size: 9, font: 'Helvetica-Bold' });
    pdf.drawWrappedText({
      x: margin + 12,
      y: footerTop - 38,
      text: [
        paymentLabel,
        payment ? 'Monto registrado: ' + this.formatMoney(payment.amount) : null,
        'Este documento confirma la compra registrada en la tienda.',
        'No reemplaza una factura fiscal emitida por organismos oficiales.',
      ].filter(Boolean).join('\n'),
      maxWidth: leftFooterWidth - 24,
      size: 8.8,
      lineHeight: 12,
    });

    const totalX = margin + leftFooterWidth + 14;
    pdf.drawRect({ x: totalX, y: footerTop - 112, width: totalBoxWidth, height: 112, lineWidth: 1 });
    const totalRows = [
      ['Subtotal', this.formatMoney(receiptSubtotal)],
      ['Descuento', this.formatMoney(receiptDiscountAmount)],
      ['Envio', this.formatMoney(receiptShippingCost)],
      ['Importe total', this.formatMoney(receiptTotal)],
    ];
    let totalY = footerTop - 20;
    totalRows.forEach(([label, value], index) => {
      const bold = index === totalRows.length - 1;
      pdf.drawText({ x: totalX + 12, y: totalY, text: label, size: bold ? 11 : 9, font: bold ? 'Helvetica-Bold' : 'Helvetica' });
      drawRightText(value, totalX + totalBoxWidth - 12, totalY, bold ? 11 : 9, 'Helvetica-Bold');
      totalY -= bold ? 20 : 16;
      if (index === totalRows.length - 2) {
        pdf.drawLine({ x1: totalX + 12, y1: totalY + 8, x2: totalX + totalBoxWidth - 12, y2: totalY + 8, lineWidth: 0.8 });
      }
    });

    cursorY = footerTop - 136;
    pdf.drawLine({ x1: margin, y1: cursorY, x2: rightEdge, y2: cursorY, lineWidth: 0.8 });
    pdf.drawText({ x: margin, y: cursorY - 18, text: storeName + ' - Gracias por tu compra', size: 9, font: 'Helvetica-Bold' });
    drawRightText('Documento no fiscal', rightEdge, cursorY - 18, 8);

    return pdf.save();
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
          document: true,
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
      cashRegister: {
        select: {
          id: true,
          closedAt: true,
        },
      },
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

  private async refreshAutomaticShipmentIfNeeded<
    T extends {
      id: number;
      shipment?: {
        id: string;
        provider?: string | null;
        trackingNumber?: string | null;
        labelUrl?: string | null;
      } | null;
    },
  >(storeId: number, order: T): Promise<T> {
    const shipment = order.shipment;

    if (!shipment) {
      return order;
    }

    const provider = shipment.provider?.trim().toLowerCase() ?? '';
    if (!this.isAutomaticCarrierProvider(provider)) {
      return order;
    }

    if (shipment.trackingNumber?.trim() || shipment.labelUrl?.trim()) {
      return order;
    }

    try {
      await this.shipmentService.refreshShipmentFromProvider(storeId, shipment.id);
    } catch (error) {
      console.warn(
        `[OrdersService] Shipment refresh on order detail failed for order ${order.id}:`,
        error instanceof Error ? error.message : error,
      );
      return order;
    }

    const refreshedOrder = await this.prisma.order.findFirst({
      where: {
        id: order.id,
        storeId,
      },
      include: this.orderInclude(),
    });

    return (refreshedOrder ?? order) as T;
  }

  private isAutomaticCarrierProvider(provider: string) {
    return provider === 'correo-argentino' || provider === 'enviopack';
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
      payments?: {
        some: {
          provider?: string;
          method?: string;
        };
      };
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

    const provider = query.provider?.trim();
    const method = query.method?.trim();

    if (provider || method) {
      where.payments = {
        some: {},
      };

      if (provider) {
        where.payments.some.provider = provider;
      }

      if (method) {
        where.payments.some.method = method;
      }
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

  private formatMoney(value: { toNumber(): number } | number | null | undefined) {
    if (value === null || value === undefined) {
      return 'No informado';
    }

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

  private customerStatusTitle(
    status: string,
    pickupOrder = false,
  ) {
    if (pickupOrder && (status === 'picked_up' || status === 'delivered')) {
      return 'Compra retirada';
    }
    if (pickupOrder && (status === 'ready_for_pickup' || status === 'shipped')) {
      return 'Lista para retirar';
    }
    if (pickupOrder && status === 'packed') return 'Compra preparada para retiro';
    if (status === 'delivered') return 'Compra entregada';
    if (status === 'shipped') return 'Compra en camino';
    if (status === 'packed') return 'Compra lista para despacho';
    if (status === 'processing') return 'Compra en preparacion';
    if (status === 'paid') return 'Pago confirmado';
    return 'Actualizacion de tu compra';
  }

  private customerStatusBody(
    status: string,
    trackingNumber?: string | null,
    pickupOrder = false,
  ) {
    if (pickupOrder && (status === 'picked_up' || status === 'delivered')) {
      return 'Tu pedido figura como retirado. Si necesitas ayuda, podes revisar el detalle desde tu cuenta.';
    }

    if (pickupOrder && (status === 'ready_for_pickup' || status === 'shipped')) {
      return 'Tu pedido ya esta listo para retirar. El comercio puede coordinar horarios y condiciones por telefono.';
    }

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
      shippingMethod?: string | null;
      shippingProvider?: string | null;
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
    const pickupOrder = this.isPickupOrder({
      shippingMethod: order.shippingMethod,
      shippingProvider: order.shippingProvider,
    });

    await this.adminNotificationMailService.sendCustomerNotification({
      storeId,
      customerEmail,
      customerName: customerName || customerEmail,
      title: this.customerStatusTitle(order.status, pickupOrder),
      body: this.customerStatusBody(
        order.status,
        order.shipment?.trackingNumber,
        pickupOrder,
      ),
      href: `/account/orders/${order.id}`,
      buttonLabel: 'Ver detalle',
    });
  }
}
