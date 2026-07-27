import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { access } from 'fs/promises';
import { join } from 'path';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { ApproveReturnDto } from './dto/approve-return.dto';
import { ReviewReturnDto } from './dto/review-return.dto';
import { ReceiveReturnDto } from './dto/receive-return.dto';
import { ShipReturnDto } from './dto/ship-return.dto';
import { CreateManualReturnDto } from './dto/create-manual-return.dto';
import { UpdateManualReturnDto } from './dto/update-manual-return.dto';
import { MercadoPagoProvider } from '../payments/providers/mercadopago.provider';
import { AdminNotificationMailService } from '../notifications/admin-notification-mail.service';
import { privateUploadsDir, uploadsDir } from '../../common/uploads';

type UploadedReturnProof = { filename: string; originalname: string };
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'OWNER', 'ADMIN', 'STAFF']);

@Injectable()
export class ReturnsService {
  constructor(
    private prisma: PrismaService,
    private mercadopago: MercadoPagoProvider,
    private adminNotificationMailService: AdminNotificationMailService,
  ) {}

  async findManualReturns(
    storeId: number,
    userId?: number,
    requestedStoreLocationId?: number,
  ) {
    const location = await this.resolveUserLocation(storeId, userId, requestedStoreLocationId);

    const rows = await this.prisma.manualReturn.findMany({
      where: {
        storeId,
        ...(location ? { storeLocationId: location.id } : {}),
      },
      include: this.manualReturnInclude(),
      orderBy: { createdAt: 'desc' },
      take: 80,
    });
    const sessions = await this.prisma.cashRegisterSession.findMany({
      where: { storeId, ...(location ? { storeLocationId: location.id } : {}) },
      select: { id: true, storeLocationId: true, openedAt: true, closedAt: true },
      orderBy: { openedAt: 'desc' },
    });
    return rows.map((entry) => {
      const inferredSession = entry.cashRegister ?? sessions.find((session) =>
        session.storeLocationId === entry.storeLocationId &&
        session.openedAt <= entry.createdAt &&
        (!session.closedAt || session.closedAt >= entry.createdAt),
      );
      return {
        ...entry,
        correctionLocked: entry.cashRegisterId
          ? Boolean(entry.cashRegister?.closedAt)
          : !inferredSession || Boolean(inferredSession.closedAt),
      };
    });
  }

  async createManualReturn(
    storeId: number,
    createdByUserId: number | undefined,
    dto: CreateManualReturnDto,
  ) {
    const returnedItems = dto.returnedItems ?? [];
    const exchangeItems = dto.exchangeItems ?? [];

    if (!returnedItems.length) {
      throw new BadRequestException('Select at least one returned item');
    }

    for (const item of [...returnedItems, ...exchangeItems]) {
      if (!Number.isInteger(item.variantId) || item.variantId <= 0) {
        throw new BadRequestException('Invalid variant');
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException('Quantity must be greater than zero');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const variantIds = [...returnedItems, ...exchangeItems].map((item) => item.variantId);
      const variants = await tx.productVariant.findMany({
        where: {
          id: { in: variantIds },
          product: { storeId },
        },
        include: {
          product: true,
          inventories: {
            where: { storeId },
          },
        },
      });
      const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

      const normalizeItem = (item: { variantId: number; quantity: number; price?: number }) => {
        const variant = variantsById.get(item.variantId);

        if (!variant) {
          throw new NotFoundException(`Variant ${item.variantId} not found`);
        }

        const price = Number(item.price ?? variant.price);

        if (!Number.isFinite(price) || price < 0) {
          throw new BadRequestException('Price must be zero or greater');
        }

        return {
          variant,
          variantId: item.variantId,
          quantity: item.quantity,
          price: this.roundMoney(price),
        };
      };

      const normalizedReturned = returnedItems.map(normalizeItem);
      const normalizedExchange = exchangeItems.map(normalizeItem);

      for (const item of normalizedExchange) {
        const inventory = item.variant.inventories[0];
        const available = Number(inventory?.quantity ?? 0) - Number(inventory?.reserved ?? 0);

        if (!inventory || available < item.quantity) {
          throw new BadRequestException(
            `Not enough stock for variant ${item.variantId}`,
          );
        }
      }

      for (const item of normalizedReturned) {
        await tx.inventory.upsert({
          where: {
            storeId_variantId: {
              storeId,
              variantId: item.variantId,
            },
          },
          create: {
            storeId,
            variantId: item.variantId,
            quantity: item.quantity,
            reserved: 0,
          },
          update: {
            quantity: {
              increment: item.quantity,
            },
          },
        });
      }

      for (const item of normalizedExchange) {
        await tx.inventory.update({
          where: {
            storeId_variantId: {
              storeId,
              variantId: item.variantId,
            },
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      const totalReturned = this.roundMoney(
        normalizedReturned.reduce((sum, item) => sum + item.price * item.quantity, 0),
      );
      const totalExchange = this.roundMoney(
        normalizedExchange.reduce((sum, item) => sum + item.price * item.quantity, 0),
      );
      const differenceAmount = this.roundMoney(totalExchange - totalReturned);
      const settlementMethod =
        dto.settlementMethod?.trim() ||
        (differenceAmount > 0 ? 'Cuenta corriente' : 'Sin diferencia');
      const needsCurrentAccount =
        differenceAmount < 0 ||
        (differenceAmount > 0 && settlementMethod === 'Cuenta corriente');

      if (differenceAmount < 0 && !dto.customerId) {
        throw new BadRequestException(
          'Para dejar saldo a favor, selecciona o crea una cuenta corriente.',
        );
      }

      const cashContext = await this.resolveManualReturnCashContext(
        storeId,
        createdByUserId,
        differenceAmount > 0 && settlementMethod !== 'Cuenta corriente',
        dto.storeLocationId,
      );
      const { customer, account } =
        needsCurrentAccount || this.hasManualReturnCustomerData(dto)
          ? await this.ensureManualReturnAccountTx(
              tx,
              storeId,
              cashContext.storeLocationId,
              dto,
              needsCurrentAccount,
            )
          : { customer: null, account: null };
      const manualReturnStoreLocationId =
        cashContext.storeLocationId ?? account?.storeLocationId ?? null;

      const manualReturn = await tx.manualReturn.create({
        data: {
          storeId,
          storeLocationId: manualReturnStoreLocationId,
          cashRegisterId: cashContext.cashRegisterId,
          customerId: customer?.id ?? null,
          currentAccountId: account?.id ?? null,
          returnedPaymentMethod: dto.returnedPaymentMethod?.trim() || null,
          returnedDiscountApplied: dto.returnedDiscountApplied !== false,
          exchangeDiscountApplied: dto.exchangeDiscountApplied !== false,
          settlementMethod,
          customerName:
            dto.customerName?.trim() ||
            this.joinCustomerName(customer?.firstName, customer?.lastName) ||
            customer?.email ||
            customer?.phone ||
            null,
          notes: dto.notes?.trim() || null,
          totalReturned,
          totalExchange,
          differenceAmount,
          items: {
            create: [
              ...normalizedReturned.map((item) => ({
                storeId,
                variantId: item.variantId,
                kind: 'returned',
                quantity: item.quantity,
                price: item.price,
              })),
              ...normalizedExchange.map((item) => ({
                storeId,
                variantId: item.variantId,
                kind: 'exchange',
                quantity: item.quantity,
                price: item.price,
              })),
            ],
          },
        },
        include: this.manualReturnInclude(),
      });

      if (account) {
        await this.recordManualReturnSettlementTx(tx, {
          storeId,
          storeLocationId: manualReturnStoreLocationId,
          cashRegisterId: cashContext.cashRegisterId,
          account,
          customerId: customer!.id,
          manualReturnId: manualReturn.id,
          differenceAmount,
          settlementMethod,
          createdByUserId,
        });
      }

      await tx.manualReturnEvent?.create({
        data: {
          storeId,
          manualReturnId: manualReturn.id,
          type: 'manual_return.created',
          message: dto.notes?.trim() || null,
          actorId: createdByUserId,
          metadata: {
            totalReturned,
            totalExchange,
            differenceAmount,
            settlementMethod,
          },
        },
      });

      return manualReturn;
    });
  }

  async updateManualReturn(
    storeId: number,
    userId: number | undefined,
    manualReturnId: number,
    dto: UpdateManualReturnDto,
  ) {
    await this.ensureManualReturnCorrectionAllowed(storeId, userId);
    const reason = dto.reason?.trim();
    if (!reason) {
      throw new BadRequestException('Indica el motivo de la correccion.');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.manualReturn.findFirst({
        where: { id: manualReturnId, storeId },
        include: {
          items: true,
          cashRegister: { select: { id: true, closedAt: true } },
          currentAccount: true,
        },
      });

      if (!existing) {
        throw new NotFoundException('Manual return not found');
      }
      if (existing.cashRegister?.closedAt) {
        throw new BadRequestException(
          'La devolucion no se puede editar porque la caja asociada ya esta cerrada.',
        );
      }
      if (!existing.cashRegisterId && existing.storeLocationId) {
        const historicalSession = await tx.cashRegisterSession.findFirst({
          where: {
            storeId,
            storeLocationId: existing.storeLocationId,
            openedAt: { lte: existing.createdAt },
            OR: [{ closedAt: null }, { closedAt: { gte: existing.createdAt } }],
          },
          orderBy: { openedAt: 'desc' },
        });
        if (historicalSession?.closedAt) {
          throw new BadRequestException(
            'La devolucion no se puede editar porque la caja asociada ya esta cerrada.',
          );
        }
        if (!historicalSession) {
          throw new BadRequestException(
            'La devolucion no se puede editar porque no se puede verificar una caja abierta asociada.',
          );
        }
      }

      const returnedItems = dto.returnedItems ?? [];
      const exchangeItems = dto.exchangeItems ?? [];
      const variantIds = [...new Set([...existing.items.map((item) => item.variantId), ...returnedItems.map((item) => item.variantId), ...exchangeItems.map((item) => item.variantId)])];
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds }, product: { storeId } },
        include: { product: true, inventories: { where: { storeId } } },
      });
      const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
      if (variantsById.size !== variantIds.length) {
        throw new BadRequestException('Uno o mas productos no pertenecen a esta tienda.');
      }

      const normalize = (item: { variantId: number; quantity: number; price?: number }) => {
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
          throw new BadRequestException('Quantity must be greater than zero');
        }
        const variant = variantsById.get(item.variantId)!;
        const price = this.roundMoney(Number(item.price ?? variant.price));
        if (!Number.isFinite(price) || price < 0) {
          throw new BadRequestException('Price must be zero or greater');
        }
        return { variantId: item.variantId, quantity: item.quantity, price };
      };
      const nextReturned = returnedItems.map(normalize);
      const nextExchange = exchangeItems.map(normalize);
      const stockEffect = (items: Array<{ variantId: number; quantity: number }>, sign: number) => {
        const result = new Map<number, number>();
        for (const item of items) result.set(item.variantId, (result.get(item.variantId) ?? 0) + item.quantity * sign);
        return result;
      };
      const previousEffect = stockEffect(existing.items.filter((item) => item.kind === 'returned'), 1);
      for (const [variantId, amount] of stockEffect(existing.items.filter((item) => item.kind === 'exchange'), -1)) {
        previousEffect.set(variantId, (previousEffect.get(variantId) ?? 0) + amount);
      }
      const nextEffect = stockEffect(nextReturned, 1);
      for (const [variantId, amount] of stockEffect(nextExchange, -1)) {
        nextEffect.set(variantId, (nextEffect.get(variantId) ?? 0) + amount);
      }

      for (const variantId of variantIds) {
        const delta = (nextEffect.get(variantId) ?? 0) - (previousEffect.get(variantId) ?? 0);
        if (!delta) continue;
        const inventory = await tx.inventory.findUnique({
          where: { storeId_variantId: { storeId, variantId } },
        });
        if (delta < 0 && (!inventory || inventory.quantity - inventory.reserved < Math.abs(delta))) {
          throw new BadRequestException(`Not enough stock for variant ${variantId}`);
        }
        await tx.inventory.upsert({
          where: { storeId_variantId: { storeId, variantId } },
          create: { storeId, variantId, quantity: delta, reserved: 0 },
          update: { quantity: delta > 0 ? { increment: delta } : { decrement: Math.abs(delta) } },
        });
      }

      const totalReturned = this.roundMoney(nextReturned.reduce((sum, item) => sum + item.price * item.quantity, 0));
      const totalExchange = this.roundMoney(nextExchange.reduce((sum, item) => sum + item.price * item.quantity, 0));
      const differenceAmount = this.roundMoney(totalExchange - totalReturned);
      const settlementMethod = dto.settlementMethod?.trim() || (differenceAmount > 0 ? existing.settlementMethod || 'Efectivo' : 'Cuenta corriente');
      const previousAccountImpact = this.manualReturnAccountImpact(Number(existing.differenceAmount), existing.settlementMethod);
      const nextAccountImpact = this.manualReturnAccountImpact(differenceAmount, settlementMethod);
      const accountDelta = this.roundMoney(nextAccountImpact - previousAccountImpact);

      if (accountDelta !== 0) {
        const account = existing.currentAccount;
        if (!account) {
          throw new BadRequestException('La correccion requiere la cuenta corriente original.');
        }
        const nextBalance = this.roundMoney(Number(account.balance) + accountDelta);
        await tx.currentAccount.update({
          where: { id: account.id },
          data: { balance: nextBalance, lastMovementAt: new Date() },
        });
        await tx.currentAccountMovement.create({
          data: {
            storeId,
            storeLocationId: existing.storeLocationId,
            accountId: account.id,
            customerId: existing.customerId ?? account.customerId,
            manualReturnId,
            type: accountDelta > 0 ? 'ADJUSTMENT_POSITIVE' : 'ADJUSTMENT_NEGATIVE',
            amount: accountDelta,
            paymentMethod: 'Cuenta corriente',
            description: `Correccion de devolucion/cambio manual #${manualReturnId}: ${reason}`,
            createdByUserId: userId,
            balanceAfter: nextBalance,
          },
        });
      }

      await tx.manualReturnItem.deleteMany({ where: { manualReturnId } });
      const updated = await tx.manualReturn.update({
        where: { id: manualReturnId },
        data: {
          customerName: dto.customerName?.trim() || existing.customerName,
          returnedPaymentMethod: dto.returnedPaymentMethod?.trim() || existing.returnedPaymentMethod,
          returnedDiscountApplied: dto.returnedDiscountApplied,
          exchangeDiscountApplied: dto.exchangeDiscountApplied,
          settlementMethod,
          notes: dto.notes?.trim() || null,
          totalReturned,
          totalExchange,
          differenceAmount,
          items: {
            create: [
              ...nextReturned.map((item) => ({ ...item, storeId, kind: 'returned' })),
              ...nextExchange.map((item) => ({ ...item, storeId, kind: 'exchange' })),
            ],
          },
        },
        include: this.manualReturnInclude(),
      });
      await tx.manualReturnEvent.create({
        data: {
          storeId,
          manualReturnId,
          type: 'manual_return.corrected',
          message: reason,
          actorId: userId,
          metadata: {
            previous: this.manualReturnSnapshot(existing),
            next: this.manualReturnSnapshot(updated),
            accountDelta,
          },
        },
      });
      return updated;
    });
  }

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

    if (!['delivered', 'picked_up'].includes(order.status)) {
      throw new BadRequestException(
        'Returns are only available after the order is delivered or picked up',
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

    const createdReturn = await this.prisma.return.create({
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

    await this.adminNotificationMailService.sendAdminNotification({
      storeId,
      title: `Nueva devolucion #${createdReturn.id}`,
      body: `Se genero una devolucion para el pedido #${createdReturn.orderId}.`,
      href: '/account?section=admin-returns',
      buttonLabel: 'Abrir devoluciones',
    });

    return this.withProtectedShipmentProof(createdReturn);
  }

  async approveReturn(storeId: number, returnId: number, dto: ApproveReturnDto) {
    return this.reviewReturn(storeId, returnId, {
      approve: dto.approve,
      adminNotes: dto.approve && dto.refundAmount != null
        ? `Refund amount requested for resolution: ${dto.refundAmount}`
        : undefined,
    });
  }

  async reviewReturn(storeId: number, returnId: number, dto: ReviewReturnDto) {
    const returnRequest = await this.prisma.return.findFirst({
      where: {
        id: returnId,
        storeId,
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
    });

    if (!returnRequest) {
      throw new NotFoundException('Return not found');
    }

    if (returnRequest.status !== 'requested') {
      throw new BadRequestException('Return already processed');
    }

    const updatedReturn = await this.prisma.return.update({
      where: { id: returnId },
      data: dto.approve
        ? {
            status: 'approved',
            approvedAt: new Date(),
            adminInstructions: dto.adminInstructions?.trim() || null,
            adminNotes: dto.adminNotes?.trim() || null,
          }
        : {
            status: 'rejected',
            adminNotes: dto.adminNotes?.trim() || null,
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
    });

    return this.withProtectedShipmentProof(updatedReturn);
  }

  async shipReturn(
    storeId: number,
    customerId: number,
    returnId: number,
    dto: ShipReturnDto,
    file?: UploadedReturnProof,
  ) {
    const returnRequest = await this.prisma.return.findFirst({
      where: {
        id: returnId,
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
    });

    if (!returnRequest) {
      throw new NotFoundException('Return not found');
    }

    if (returnRequest.status !== 'approved') {
      throw new BadRequestException(
        'Only approved returns can be marked as shipped by the customer',
      );
    }

    if (returnRequest.shippedAt || returnRequest.receivedAt || returnRequest.resolvedAt) {
      throw new BadRequestException('Return shipping was already registered');
    }

    if (!dto.carrier?.trim() && !dto.trackingNumber?.trim() && !file?.filename) {
      throw new BadRequestException(
        'Provide at least one shipping detail or proof for this return',
      );
    }

    const updatedReturn = await this.prisma.return.update({
      where: { id: returnId },
      data: {
        customerShipmentCarrier: dto.carrier?.trim() || null,
        customerShipmentTracking: dto.trackingNumber?.trim() || null,
        customerShipmentProofUrl: file?.filename
          ? `/private-uploads/${file.filename}`
          : returnRequest.customerShipmentProofUrl,
        shippedAt: new Date(),
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
    });

    return this.withProtectedShipmentProof(updatedReturn);
  }

  async receiveReturn(storeId: number, returnId: number, dto: ReceiveReturnDto) {
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

      if (
        returnRequest.status !== 'approved' &&
        returnRequest.status !== 'received'
      ) {
        throw new BadRequestException(
          'Only approved or received returns can be processed from this step',
        );
      }

      if (returnRequest.resolvedAt) {
        throw new BadRequestException('Return was already resolved');
      }

      const wasAlreadyReceived = Boolean(returnRequest.receivedAt);

      if (!wasAlreadyReceived) {
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
      }

      const payment = await tx.payment.findFirst({
        where: {
          orderId: returnRequest.orderId,
          status: {
            in: ['approved', 'partially_refunded'],
          },
        },
      });

      const shouldRefund = dto.refundCustomer !== false;
      let refund: { id: number; amount: { toNumber(): number } | number } | null = null;

      if (payment && shouldRefund) {
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

      const nextStatus = refund
        ? 'refunded'
        : shouldRefund || wasAlreadyReceived
          ? 'resolved'
          : 'received';

      const updatedReturn = await tx.return.update({
        where: { id: returnId },
        data: {
          status: nextStatus,
          receivedAt: returnRequest.receivedAt ?? new Date(),
          resolvedAt:
            nextStatus === 'resolved' || nextStatus === 'refunded'
              ? new Date()
              : null,
          adminNotes: dto.adminNotes?.trim()
            ? [returnRequest.adminNotes, dto.adminNotes.trim()]
                .filter(Boolean)
                .join('\n')
            : returnRequest.adminNotes,
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
        return: this.withProtectedShipmentProof(updatedReturn),
        refund,
      };
    });
  }

  async getReturnShipmentProofFile(
    storeId: number,
    returnId: number,
    requester: { sub: number; role?: string | null },
  ) {
    const returnRequest = await this.prisma.return.findFirst({
      where: {
        id: returnId,
        storeId,
      },
      select: {
        id: true,
        customerShipmentProofUrl: true,
        order: {
          select: {
            customerId: true,
          },
        },
      },
    });

    if (!returnRequest?.customerShipmentProofUrl) {
      throw new NotFoundException('Return proof not found');
    }

    const requesterRole = requester.role ?? 'CUSTOMER';
    const isAdmin = ADMIN_ROLES.has(requesterRole);

    if (!isAdmin && returnRequest.order.customerId !== requester.sub) {
      throw new ForbiddenException('You cannot access this return proof');
    }

    return this.resolveProofAbsolutePath(returnRequest.customerShipmentProofUrl);
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
    const returns = await this.prisma.return.findMany({
      where: { storeId },
      include: {
        items: true,
        refund: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return returns.map((entry) => this.withProtectedShipmentProof(entry));
  }

  async findMine(storeId: number, customerId: number) {
    const returns = await this.prisma.return.findMany({
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

    return returns.map((entry) => this.withProtectedShipmentProof(entry));
  }

  private withProtectedShipmentProof<T extends Record<string, any>>(entry: T): T {
    if (!entry.customerShipmentProofUrl) {
      return entry;
    }

    return {
      ...entry,
      customerShipmentProofUrl: `/returns/${entry.id}/proof`,
    };
  }

  private manualReturnInclude() {
    return {
      cashRegister: {
        select: {
          id: true,
          closedAt: true,
        },
      },
      events: {
        orderBy: {
          createdAt: 'desc' as const,
        },
        take: 20,
      },
      items: {
        include: {
          variant: {
            include: {
              product: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
        orderBy: {
          id: 'asc' as const,
        },
      },
    };
  }

  private async ensureManualReturnCorrectionAllowed(storeId: number, userId?: number) {
    if (!userId) {
      throw new ForbiddenException('Only ADMIN and OWNER can correct manual returns');
    }
    const user = await this.prisma.user.findFirst({
      where: { id: userId, storeId },
      select: { role: true },
    });
    if (!['ADMIN', 'OWNER', 'SUPER_ADMIN'].includes(String(user?.role))) {
      throw new ForbiddenException('Only ADMIN and OWNER can correct manual returns');
    }
  }

  private manualReturnAccountImpact(differenceAmount: number, settlementMethod?: string | null) {
    if (differenceAmount < 0) return differenceAmount;
    if (differenceAmount > 0 && settlementMethod === 'Cuenta corriente') return differenceAmount;
    return 0;
  }

  private manualReturnSnapshot(entry: any) {
    return {
      customerName: entry.customerName ?? null,
      returnedPaymentMethod: entry.returnedPaymentMethod ?? null,
      returnedDiscountApplied: entry.returnedDiscountApplied ?? true,
      exchangeDiscountApplied: entry.exchangeDiscountApplied ?? true,
      settlementMethod: entry.settlementMethod ?? null,
      notes: entry.notes ?? null,
      totalReturned: Number(entry.totalReturned ?? 0),
      totalExchange: Number(entry.totalExchange ?? 0),
      differenceAmount: Number(entry.differenceAmount ?? 0),
      items: (entry.items ?? []).map((item: any) => ({
        variantId: item.variantId,
        kind: item.kind,
        quantity: item.quantity,
        price: Number(item.price),
      })),
    };
  }

  private async resolveManualReturnCashContext(
    storeId: number,
    userId: number | undefined,
    requireOpenCash: boolean,
    requestedStoreLocationId?: number,
  ) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { cashRegisterMode: true },
    });
    const location = await this.resolveUserLocation(storeId, userId, requestedStoreLocationId);

    if (store?.cashRegisterMode !== 'manual') {
      return {
        storeLocationId: location?.id ?? null,
        cashRegisterId: null as number | null,
      };
    }

    if (!location) {
      throw new BadRequestException(
        'Asigna este usuario a un local fisico antes de registrar devoluciones manuales.',
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

    if (requireOpenCash && !session) {
      throw new BadRequestException(
        `No hay una caja abierta para ${location.name}. Un encargado debe abrirla antes de cobrar diferencias.`,
      );
    }

    return {
      storeLocationId: location.id,
      cashRegisterId: session?.id ?? null,
    };
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

  private async ensureManualReturnAccountTx(
    tx: any,
    storeId: number,
    storeLocationId: number | null,
    dto: CreateManualReturnDto,
    needsCurrentAccount: boolean,
  ) {
    const customer = dto.customerId
      ? await tx.customer.findFirst({
          where: {
            id: dto.customerId,
            storeId,
          },
        })
      : await this.findOrCreateManualReturnCustomerTx(tx, storeId, dto);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    await tx.customer.update({
      where: { id: customer.id },
      data: {
        ...(needsCurrentAccount ? { source: 'current_account' } : {}),
        firstName: dto.customerFirstName?.trim() || customer.firstName,
        lastName: dto.customerLastName?.trim() || customer.lastName,
        phone: dto.customerPhone?.trim() || customer.phone,
        email: dto.customerEmail?.trim().toLowerCase() || customer.email,
      },
    });

    const existingAccount = await tx.currentAccount.findFirst({
      where: {
        storeId,
        customerId: customer.id,
        storeLocationId,
      },
    });

    if (!needsCurrentAccount) {
      return { customer, account: existingAccount ?? null };
    }

    const account = existingAccount
      ? await tx.currentAccount.update({
          where: { id: existingAccount.id },
          data: {
            deletedAt: null,
            ...(storeLocationId && !existingAccount.storeLocationId
              ? { storeLocationId }
              : {}),
            lastMovementAt: new Date(),
          },
        })
      : await tx.currentAccount.create({
          data: {
            storeId,
            storeLocationId,
            customerId: customer.id,
            balance: 0,
            lastMovementAt: new Date(),
          },
        });

    return { customer, account };
  }

  private async findOrCreateManualReturnCustomerTx(
    tx: any,
    storeId: number,
    dto: CreateManualReturnDto,
  ) {
    const email = dto.customerEmail?.trim().toLowerCase() || null;
    const phone = dto.customerPhone?.trim() || null;
    const explicitFirstName = dto.customerFirstName?.trim();
    const explicitLastName = dto.customerLastName?.trim();
    const parsedName = this.parseCustomerName(dto.customerName);
    const firstName = explicitFirstName || parsedName.firstName;
    const lastName = explicitLastName || parsedName.lastName;

    if (!email && !phone && !firstName && !lastName) {
      throw new BadRequestException(
        'Selecciona una cuenta corriente o carga el nombre del cliente.',
      );
    }

    if (email) {
      const existing = await tx.customer.findUnique({
        where: {
          storeId_email: {
            storeId,
            email,
          },
        },
      });

      if (existing) {
        return existing;
      }
    }

    if (phone) {
      const existingByPhone = await tx.customer.findFirst({
        where: {
          storeId,
          phone,
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (existingByPhone) {
        return existingByPhone;
      }
    }

    return tx.customer.create({
      data: {
        storeId,
        source: 'current_account',
        email,
        phone,
        firstName,
        lastName,
      },
    });
  }

  private hasManualReturnCustomerData(dto: CreateManualReturnDto) {
    return Boolean(
      dto.customerId ||
        dto.customerName?.trim() ||
        dto.customerFirstName?.trim() ||
        dto.customerLastName?.trim() ||
        dto.customerEmail?.trim() ||
        dto.customerPhone?.trim(),
    );
  }

  private async recordManualReturnSettlementTx(
    tx: any,
    input: {
      storeId: number;
      storeLocationId: number | null;
      cashRegisterId: number | null;
      account: { id: number; balance: unknown };
      customerId: number;
      manualReturnId: number;
      differenceAmount: number;
      settlementMethod: string;
      createdByUserId?: number;
    },
  ) {
    const previousBalance = Number(input.account.balance ?? 0);
    const description = `Devolucion/cambio manual #${input.manualReturnId}`;

    if (input.differenceAmount < 0) {
      const creditAmount = this.roundMoney(input.differenceAmount);
      const nextBalance = this.roundMoney(previousBalance + creditAmount);

      await tx.currentAccount.update({
        where: { id: input.account.id },
        data: {
          balance: nextBalance,
          lastMovementAt: new Date(),
        },
      });

      await tx.currentAccountMovement.create({
        data: {
          storeId: input.storeId,
          storeLocationId: input.storeLocationId,
          accountId: input.account.id,
          customerId: input.customerId,
          type: 'CREDIT_NOTE',
          amount: creditAmount,
          paymentMethod: 'Saldo a favor',
          description,
          manualReturnId: input.manualReturnId,
          createdByUserId: input.createdByUserId,
          balanceAfter: nextBalance,
        },
      });
      return;
    }

    if (input.differenceAmount === 0) {
      return;
    }

    const chargeAmount = this.roundMoney(input.differenceAmount);
    const chargeBalance = this.roundMoney(previousBalance + chargeAmount);

    await tx.currentAccount.update({
      where: { id: input.account.id },
      data: {
        balance: chargeBalance,
        lastMovementAt: new Date(),
      },
    });

    await tx.currentAccountMovement.create({
      data: {
        storeId: input.storeId,
        storeLocationId: input.storeLocationId,
        accountId: input.account.id,
        customerId: input.customerId,
        type: 'SALE',
        amount: chargeAmount,
        paymentMethod: 'Cuenta corriente',
        description,
        manualReturnId: input.manualReturnId,
        createdByUserId: input.createdByUserId,
        balanceAfter: chargeBalance,
      },
    });

    if (input.settlementMethod === 'Cuenta corriente') {
      return;
    }

    await tx.currentAccount.update({
      where: { id: input.account.id },
      data: {
        balance: previousBalance,
        lastMovementAt: new Date(),
      },
    });

    await tx.currentAccountMovement.create({
      data: {
        storeId: input.storeId,
        storeLocationId: input.storeLocationId,
        accountId: input.account.id,
        customerId: input.customerId,
        cashRegisterId: input.cashRegisterId,
        type: 'PAYMENT',
        amount: -chargeAmount,
        paymentMethod: input.settlementMethod,
        description: `${description} - diferencia abonada`,
        manualReturnId: input.manualReturnId,
        createdByUserId: input.createdByUserId,
        balanceAfter: previousBalance,
      },
    });
  }

  private parseCustomerName(value?: string | null) {
    const parts = (value ?? '').trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      return { firstName: null, lastName: null };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ') || null,
    };
  }

  private joinCustomerName(firstName?: string | null, lastName?: string | null) {
    return [firstName, lastName].filter(Boolean).join(' ').trim();
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private async resolveProofAbsolutePath(proofUrl: string) {
    const normalizedProofUrl = proofUrl.replace(/^\/+/, '');
    const filename = normalizedProofUrl.split('/').pop();

    if (!filename) {
      throw new NotFoundException('Return proof file is missing');
    }

    const preferredPath = join(privateUploadsDir, filename);

    try {
      await access(preferredPath);
      return preferredPath;
    } catch {
      const legacyPath = join(uploadsDir, filename);

      try {
        await access(legacyPath);
        return legacyPath;
      } catch {
        throw new NotFoundException('Return proof file is missing');
      }
    }
  }
}
