import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SimplePdfDocument } from '../../common/utils/pdf-document';
import { normalizeEmail } from '../../common/utils/email.util';
import {
  resolveStorePricingPolicy,
  roundToNearestHundred,
} from '../../common/price-input-mode';
import { AdjustCurrentAccountDto } from './dto/adjust-current-account.dto';
import { CancelCurrentAccountPaymentDto } from './dto/cancel-current-account-payment.dto';
import { CreateCurrentAccountDto } from './dto/create-current-account.dto';
import { RegisterCurrentAccountPaymentDto } from './dto/register-current-account-payment.dto';
import { UpdateCurrentAccountDto } from './dto/update-current-account.dto';
import { UpdateCurrentAccountPaymentDto } from './dto/update-current-account-payment.dto';

const accountInclude = {
  customer: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      document: true,
      notes: true,
    },
  },
  movements: {
    take: 1,
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      type: true,
      amount: true,
      paymentMethod: true,
      description: true,
      createdAt: true,
      balanceAfter: true,
    },
  },
} as const;

type AccountLocation = { id: number; name: string; active: boolean } | null;

@Injectable()
export class CurrentAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: number, userId: number | undefined, dto: CreateCurrentAccountDto) {
    const location = await this.resolveUserLocation(storeId, userId, dto.storeLocationId);
    const customerData = this.buildCustomerUpdateData(dto);

    if (!customerData.firstName && !customerData.lastName && !customerData.phone && !customerData.email && !customerData.document) {
      throw new BadRequestException('Customer data is required');
    }

    const customer = await this.prisma.$transaction(async (tx) => {
      const existingCustomer = customerData.email
        ? await tx.customer.findUnique({
            where: {
              storeId_email: {
                storeId,
                email: customerData.email,
              },
            },
          })
        : null;

      const savedCustomer = existingCustomer
        ? await tx.customer.update({
            where: { id: existingCustomer.id },
            data: {
              source: 'current_account',
              ...this.removeUndefinedCustomerData(customerData),
            },
          })
        : await tx.customer.create({
            data: {
              storeId,
              source: 'current_account',
              email: customerData.email,
              firstName: customerData.firstName,
              lastName: customerData.lastName,
              phone: customerData.phone,
              document: customerData.document,
              notes: customerData.notes,
            },
          });

      const existingAccount = await tx.currentAccount.findFirst({
        where: {
          storeId,
          customerId: savedCustomer.id,
          storeLocationId: location?.id ?? null,
        },
      });

      if (existingAccount) {
        await tx.currentAccount.update({
          where: { id: existingAccount.id },
          data: {
            deletedAt: null,
            lastMovementAt: new Date(),
          },
        });
      } else {
        await tx.currentAccount.create({
          data: {
          storeId,
          storeLocationId: location?.id ?? null,
          customerId: savedCustomer.id,
          balance: 0,
        },
        });
      }

      await this.syncDefaultAddress(tx, storeId, savedCustomer.id, customerData, dto.address);

      return savedCustomer;
    });

    return this.findByCustomer(storeId, userId, customer.id);
  }

  async findAll(
    storeId: number,
    userId: number | undefined,
    status: 'debt' | 'credit' | 'paid' | 'all' = 'debt',
    search = '',
    requestedStoreLocationId?: number,
  ) {
    const location = await this.resolveUserLocation(storeId, userId, requestedStoreLocationId);
    const normalizedSearch = search.trim();

    const balanceFilter =
      status === 'debt'
        ? { gt: 0 }
        : status === 'credit'
          ? { lt: 0 }
        : status === 'paid'
          ? { equals: 0 }
          : undefined;

    const accounts = await this.prisma.currentAccount.findMany({
      where: {
        storeId,
        deletedAt: null,
        ...(location
          ? {
              OR: [
                { storeLocationId: location.id },
                { movements: { some: { storeLocationId: location.id } } },
              ],
            }
          : {}),
        ...(!location && balanceFilter ? { balance: balanceFilter } : {}),
        ...(normalizedSearch
          ? {
              customer: {
                OR: [
                  { email: { contains: normalizedSearch, mode: 'insensitive' } },
                  { firstName: { contains: normalizedSearch, mode: 'insensitive' } },
                  { lastName: { contains: normalizedSearch, mode: 'insensitive' } },
                  { phone: { contains: normalizedSearch, mode: 'insensitive' } },
                  { document: { contains: normalizedSearch, mode: 'insensitive' } },
                ],
              },
            }
          : {}),
      },
      include: accountInclude,
      orderBy: [
        { balance: 'desc' },
        { lastMovementAt: 'desc' },
      ],
    });

    const localized = location
      ? await Promise.all(accounts.map((account) => this.withLocalBalance(account, location.id)))
      : accounts;

    return localized.filter((account) => {
      if (!location) return true;
      const balance = Number(account.balance);
      if (status === 'debt') return balance > 0;
      if (status === 'credit') return balance < 0;
      if (status === 'paid') return balance === 0;
      return true;
    });
  }

  async findByCustomer(
    storeId: number,
    userId: number | undefined,
    customerId: number,
    requestedStoreLocationId?: number,
  ) {
    const location = await this.resolveUserLocation(storeId, userId, requestedStoreLocationId);
    const account = await this.prisma.currentAccount.findFirst({
      where: {
        storeId,
        customerId,
        ...(location ? { storeLocationId: location.id } : {}),
      },
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            document: true,
            notes: true,
          },
        },
        movements: {
          where: location ? { storeLocationId: location.id } : undefined,
          orderBy: { createdAt: 'desc' },
          include: {
            order: {
              include: {
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
                },
              },
            },
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!account || account.deletedAt) {
      throw new NotFoundException('Current account not found');
    }

    if (!location) {
      return account;
    }

    if (
      account.storeLocationId !== location.id &&
      !account.movements.some((movement) => movement.storeLocationId === location.id)
    ) {
      throw new NotFoundException('Current account not found for this location');
    }

    return this.withLocalBalance(account, location.id);
  }

  async findInactiveByPhone(storeId: number, phone: string) {
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      throw new BadRequestException('Phone is required');
    }

    const accounts = await this.prisma.currentAccount.findMany({
      where: {
        storeId,
        deletedAt: {
          not: null,
        },
        customer: {
          phone: {
            not: null,
          },
        },
      },
      include: accountInclude,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const account = accounts.find(
      (entry) => normalizePhone(entry.customer.phone) === normalizedPhone,
    );

    if (!account) {
      throw new NotFoundException('Inactive current account not found');
    }

    return account;
  }

  async registerPayment(
    storeId: number,
    customerId: number,
    createdByUserId: number | undefined,
    dto: RegisterCurrentAccountPaymentDto,
  ) {
    const cashContext = await this.resolveCashContext(storeId, createdByUserId, dto.storeLocationId);

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.currentAccount.findFirst({
        where: {
          storeId,
          customerId,
          storeLocationId: cashContext.storeLocationId,
        },
      });

      if (!account || account.deletedAt) {
        throw new NotFoundException('Current account not found');
      }

      const currentBalance = Number(account.balance);
      const currentLocalBalance = cashContext.storeLocationId
        ? await this.calculateLocalBalanceTx(tx, account.id, cashContext.storeLocationId)
        : currentBalance;
      const amount = roundCurrency(Number(dto.amount));
      const discountPercentage = dto.applyCashDiscount === false
        ? 0
        : cashContext.discountPercentage;

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('Payment amount must be greater than 0');
      }

      const paymentApplication = await this.calculatePaymentApplicationTx(
        tx,
        account.id,
        cashContext.storeLocationId,
        amount,
        currentLocalBalance,
        dto.paymentMethod,
        discountPercentage,
        cashContext.roundPaymentDiscounts,
      );

      if (
        paymentApplication.debtCancelled > currentLocalBalance ||
        amount > paymentApplication.cashToSettle
      ) {
        throw new BadRequestException('Payment cannot exceed current balance');
      }

      const nextGlobalBalance = roundCurrency(
        currentBalance - paymentApplication.debtCancelled,
      );
      const nextLocalBalance = roundCurrency(
        currentLocalBalance - paymentApplication.debtCancelled,
      );
      const paymentBalanceAfter = roundCurrency(currentLocalBalance - amount);

      const updatedAccount = await tx.currentAccount.update({
        where: { id: account.id },
        data: {
          balance: nextGlobalBalance,
          ...(cashContext.storeLocationId && !account.storeLocationId
            ? { storeLocationId: cashContext.storeLocationId }
            : {}),
          lastMovementAt: new Date(),
        },
      });

      const movement = await tx.currentAccountMovement.create({
        data: {
          storeId,
          storeLocationId: cashContext.storeLocationId,
          accountId: account.id,
          customerId,
          cashRegisterId: cashContext.cashRegisterId,
          type: 'PAYMENT',
          amount: -amount,
          paymentMethod: dto.paymentMethod,
          description: dto.description?.trim() || 'Pago de cuenta corriente',
          createdByUserId,
          balanceAfter: cashContext.storeLocationId ? paymentBalanceAfter : roundCurrency(currentBalance - amount),
        },
      });

      if (paymentApplication.discountAmount > 0) {
        await tx.currentAccountMovement.create({
          data: {
            storeId,
            storeLocationId: cashContext.storeLocationId,
            accountId: account.id,
            customerId,
            cashRegisterId: cashContext.cashRegisterId,
            type: 'ADJUSTMENT_NEGATIVE',
            amount: -paymentApplication.discountAmount,
            paymentMethod: `Descuento ${dto.paymentMethod}`,
            description: `Descuento por pago en ${dto.paymentMethod} (Pago #${movement.id})`,
            createdByUserId,
            balanceAfter: cashContext.storeLocationId ? nextLocalBalance : nextGlobalBalance,
          },
        });
      }

      return {
        account: cashContext.storeLocationId
          ? {
              ...updatedAccount,
              globalBalance: updatedAccount.balance,
              balance: nextLocalBalance,
            }
          : updatedAccount,
        movement,
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  async updatePayment(
    storeId: number,
    movementId: number,
    updatedByUserId: number | undefined,
    dto: UpdateCurrentAccountPaymentDto,
  ) {
    await this.ensureCorrectionAllowed(storeId, updatedByUserId);
    const reason = dto.reason?.trim();

    if (!reason) {
      throw new BadRequestException('Correction reason is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.currentAccountMovement.findFirst({
        where: {
          id: movementId,
          storeId,
          type: 'PAYMENT',
        },
        include: {
          account: true,
        },
      });

      if (!movement) {
        throw new NotFoundException('Payment movement not found');
      }

      await this.ensurePaymentNotCancelledTx(tx, storeId, movement.id);

      const previousAmount = Math.abs(Number(movement.amount));
      const nextAmount = roundCurrency(Number(dto.amount));

      if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
        throw new BadRequestException('Payment amount must be greater than 0');
      }

      const revertedBalance = roundCurrency(Number(movement.account.balance) + previousAmount);

      if (nextAmount > revertedBalance) {
        throw new BadRequestException('Payment cannot exceed current balance');
      }

      const nextBalance = roundCurrency(revertedBalance - nextAmount);

      await tx.currentAccount.update({
        where: { id: movement.accountId },
        data: {
          balance: nextBalance,
          lastMovementAt: new Date(),
        },
      });

      const updatedMovement = await tx.currentAccountMovement.update({
        where: { id: movement.id },
        data: {
          amount: -nextAmount,
          paymentMethod: dto.paymentMethod,
          description: dto.description?.trim() || movement.description,
        },
      });

      await this.recalculateMovementBalancesTx(
        tx,
        movement.accountId,
        movement.storeLocationId ?? null,
      );

      const auditMovement = await tx.currentAccountMovement.create({
        data: {
          storeId,
          storeLocationId: movement.storeLocationId,
          accountId: movement.accountId,
          customerId: movement.customerId,
          orderId: movement.orderId,
          cashRegisterId: movement.cashRegisterId,
          type: 'ADJUSTMENT_POSITIVE',
          amount: 0,
          paymentMethod: 'Auditoria',
          description: `Correccion de pago #${movement.id}: ${reason}. Antes ${formatCurrency(previousAmount)} por ${movement.paymentMethod || 'sin metodo'}, ahora ${formatCurrency(nextAmount)} por ${dto.paymentMethod}.`,
          createdByUserId: updatedByUserId,
          balanceAfter: nextBalance,
        },
      });

      return {
        movement: updatedMovement,
        auditMovement,
        account: {
          ...movement.account,
          balance: nextBalance,
        },
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  async cancelPayment(
    storeId: number,
    movementId: number,
    cancelledByUserId: number | undefined,
    dto: CancelCurrentAccountPaymentDto,
  ) {
    await this.ensureCorrectionAllowed(storeId, cancelledByUserId);
    const reason = dto.reason?.trim();

    if (!reason) {
      throw new BadRequestException('Cancellation reason is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.currentAccountMovement.findFirst({
        where: {
          id: movementId,
          storeId,
          type: 'PAYMENT',
        },
        include: {
          account: true,
        },
      });

      if (!movement) {
        throw new NotFoundException('Payment movement not found');
      }

      await this.ensurePaymentNotCancelledTx(tx, storeId, movement.id);

      const linkedDiscount = await tx.currentAccountMovement.findFirst({
        where: {
          storeId,
          accountId: movement.accountId,
          type: 'ADJUSTMENT_NEGATIVE',
          description: {
            contains: `(Pago #${movement.id})`,
          },
          cancelledAt: null,
          cancellationMovementId: null,
        },
      });

      const amount = Math.abs(Number(movement.amount));
      const discountAmount = linkedDiscount
        ? Math.abs(Number(linkedDiscount.amount))
        : 0;
      const totalReversalAmount = roundCurrency(amount + discountAmount);
      const nextBalance = roundCurrency(
        Number(movement.account.balance) + totalReversalAmount,
      );

      await tx.currentAccount.update({
        where: { id: movement.accountId },
        data: {
          balance: nextBalance,
          lastMovementAt: new Date(),
        },
      });

      const reversal = await tx.currentAccountMovement.create({
        data: {
          storeId,
          storeLocationId: movement.storeLocationId,
          accountId: movement.accountId,
          customerId: movement.customerId,
          orderId: movement.orderId,
          cashRegisterId: movement.cashRegisterId,
          type: 'ADJUSTMENT_POSITIVE',
          amount: totalReversalAmount,
          paymentMethod: 'Anulacion de pago',
          description: `Anulacion de pago #${movement.id}: ${reason}`,
          createdByUserId: cancelledByUserId,
          balanceAfter: nextBalance,
        },
      });

      const cancelledMovement = await tx.currentAccountMovement.update({
        where: { id: movement.id },
        data: {
          cancelledAt: new Date(),
          cancelledByUserId,
          cancellationReason: reason,
          cancellationMovementId: reversal.id,
        },
        include: {
          account: true,
        },
      });

      if (linkedDiscount) {
        await tx.currentAccountMovement.update({
          where: { id: linkedDiscount.id },
          data: {
            cancelledAt: new Date(),
            cancelledByUserId,
            cancellationReason: reason,
            cancellationMovementId: reversal.id,
          },
        });
      }

      return {
        movement: cancelledMovement,
        reversal,
        account: {
          ...movement.account,
          balance: nextBalance,
        },
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async ensurePaymentNotCancelledTx(
    tx: Prisma.TransactionClient,
    storeId: number,
    movementId: number,
  ) {
    const movement = await tx.currentAccountMovement.findFirst({
      where: {
        id: movementId,
        storeId,
        OR: [
          { cancelledAt: { not: null } },
          { cancellationMovementId: { not: null } },
        ],
      },
      select: { id: true },
    });

    if (movement) {
      throw new BadRequestException('Payment movement is already cancelled');
    }

    const cancellation = await tx.currentAccountMovement.findFirst({
      where: {
        storeId,
        paymentMethod: 'Anulacion de pago',
        description: {
          startsWith: `Anulacion de pago #${movementId}:`,
        },
      },
      select: { id: true },
    });

    if (cancellation) {
      throw new BadRequestException('Payment movement is already cancelled');
    }
  }

  private async resolveCashContext(storeId: number, userId?: number, requestedStoreLocationId?: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        domain: true,
        storefrontConfig: true,
        cashRegisterMode: true,
        bankTransferDiscountPercentage: true,
      },
    });
    const pricingPolicy = resolveStorePricingPolicy(store);
    const location = await this.resolveUserLocation(storeId, userId, requestedStoreLocationId);

    if (store?.cashRegisterMode !== 'manual') {
      const session = await this.ensureAutomaticCashRegisterSession(
        storeId,
        location?.id ?? null,
      );

      return {
        storeLocationId: location?.id ?? null,
        cashRegisterId: session.id,
        discountPercentage: pricingPolicy.cashInput.discountPercentage,
        roundPaymentDiscounts: pricingPolicy.manualSaleDiscountRounding,
      };
    }

    if (!location) {
      throw new BadRequestException(
        'Asigna este usuario a un local fisico antes de registrar pagos.',
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
        `No hay una caja abierta para ${location.name}. Un encargado debe abrirla antes de cobrar.`,
      );
    }

    return {
      storeLocationId: location.id,
      cashRegisterId: session.id,
      discountPercentage: pricingPolicy.cashInput.discountPercentage,
      roundPaymentDiscounts: pricingPolicy.manualSaleDiscountRounding,
    };
  }

  private calculatePaymentApplication(
    amount: number,
    currentBalance: number,
    paymentMethod: string,
    discountPercentage: number,
    roundDiscounts: boolean,
  ) {
    const safeAmount = roundCurrency(amount);
    const safeBalance = roundCurrency(Math.max(currentBalance, 0));
    const eligibleMethod =
      paymentMethod === 'Efectivo' || paymentMethod === 'Transferencia';
    const safePercentage = Math.min(Math.max(Number(discountPercentage) || 0, 0), 100);

    if (!eligibleMethod || safePercentage <= 0 || safePercentage >= 100) {
      return {
        cashReceived: safeAmount,
        discountAmount: 0,
        debtCancelled: safeAmount,
        cashToSettle: safeBalance,
      };
    }

    const multiplier = 1 - safePercentage / 100;
    const cashToSettle = roundDiscounts
      ? Math.ceil((safeBalance * multiplier) / 100) * 100
      : roundCurrency(safeBalance * multiplier);
    const debtCancelled =
      safeAmount >= cashToSettle
        ? safeBalance
        : roundDiscounts
          ? roundToNearestHundred(safeAmount / multiplier)
          : roundCurrency(safeAmount / multiplier);
    const cappedDebtCancelled = roundCurrency(
      Math.min(Math.max(debtCancelled, safeAmount), safeBalance),
    );

    return {
      cashReceived: safeAmount,
      discountAmount: roundCurrency(cappedDebtCancelled - safeAmount),
      debtCancelled: cappedDebtCancelled,
      cashToSettle,
    };
  }

  private async calculatePaymentApplicationTx(
    tx: Prisma.TransactionClient,
    accountId: number,
    storeLocationId: number | null,
    amount: number,
    currentBalance: number,
    paymentMethod: string,
    discountPercentage: number,
    roundDiscounts: boolean,
  ) {
    const eligibleMethod =
      paymentMethod === 'Efectivo' || paymentMethod === 'Transferencia';
    const safePercentage = Math.min(Math.max(Number(discountPercentage) || 0, 0), 100);

    if (!eligibleMethod || safePercentage <= 0 || safePercentage >= 100 || !roundDiscounts) {
      return this.calculatePaymentApplication(
        amount,
        currentBalance,
        paymentMethod,
        discountPercentage,
        roundDiscounts,
      );
    }

    const buckets = await this.buildCashDebtBucketsTx(
      tx,
      accountId,
      storeLocationId,
      safePercentage,
    );

    if (!buckets.length) {
      return this.calculatePaymentApplication(
        amount,
        currentBalance,
        paymentMethod,
        discountPercentage,
        roundDiscounts,
      );
    }

    const safeAmount = roundCurrency(amount);
    const safeBalance = roundCurrency(Math.max(currentBalance, 0));
    const bucketDebtTotal = roundCurrency(
      buckets.reduce((sum, bucket) => sum + bucket.debt, 0),
    );

    if (Math.abs(bucketDebtTotal - safeBalance) > 1) {
      return this.calculatePaymentApplication(
        amount,
        currentBalance,
        paymentMethod,
        discountPercentage,
        roundDiscounts,
      );
    }

    const cashToSettle = roundCurrency(
      buckets.reduce((sum, bucket) => sum + bucket.cash, 0),
    );

    if (safeAmount >= cashToSettle) {
      return {
        cashReceived: safeAmount,
        discountAmount: roundCurrency(safeBalance - safeAmount),
        debtCancelled: safeBalance,
        cashToSettle,
      };
    }

    const debtCancelled = this.allocateCashAcrossBuckets(
      buckets.map((bucket) => ({ ...bucket })),
      safeAmount,
    );

    return {
      cashReceived: safeAmount,
      discountAmount: roundCurrency(debtCancelled - safeAmount),
      debtCancelled,
      cashToSettle,
    };
  }

  private async buildCashDebtBucketsTx(
    tx: Prisma.TransactionClient,
    accountId: number,
    storeLocationId: number | null,
    discountPercentage: number,
  ) {
    const multiplier = 1 - discountPercentage / 100;
    const movements = await tx.currentAccountMovement.findMany({
      where: {
        accountId,
        ...(storeLocationId ? { storeLocationId } : {}),
        cancelledAt: null,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
    });
    const buckets: Array<{ debt: number; cash: number }> = [];

    for (const movement of movements) {
      const movementAmount = roundCurrency(Number(movement.amount));
      if (movementAmount > 0) {
        buckets.push({
          debt: movementAmount,
          cash: this.resolveMovementCashEquivalent(movement, movementAmount, multiplier),
        });
        continue;
      }

      if (movement.type === 'PAYMENT') {
        if (this.isDiscountedCurrentAccountPayment(movement.paymentMethod)) {
          this.allocateCashAcrossBuckets(buckets, Math.abs(movementAmount));
        } else {
          this.allocateDebtAcrossBuckets(buckets, Math.abs(movementAmount));
        }
        continue;
      }

      if (movement.paymentMethod?.startsWith('Descuento ')) {
        continue;
      }

      this.allocateDebtAcrossBuckets(buckets, Math.abs(movementAmount));
    }

    return buckets.filter((bucket) => bucket.debt > 0.01 && bucket.cash > 0.01);
  }

  private resolveMovementCashEquivalent(
    movement: Prisma.CurrentAccountMovementGetPayload<{ include: { order: { include: { items: true } } } }>,
    movementAmount: number,
    multiplier: number,
  ) {
    if (movement.type === 'SALE' && movement.order?.items?.length) {
      const orderTotal = roundCurrency(Number(movement.order.total ?? movementAmount));
      const itemCashTotal = movement.order.items.reduce((sum, item) => {
        const quantity = Number(item.quantity ?? 0);
        const unitPrice = Number(item.price ?? 0);
        return sum + roundToNearestHundred(unitPrice * multiplier) * quantity;
      }, 0);

      if (orderTotal > 0 && Math.abs(orderTotal - movementAmount) > 0.01) {
        return roundToNearestHundred(itemCashTotal * (movementAmount / orderTotal));
      }

      return roundCurrency(itemCashTotal);
    }

    return Math.ceil((movementAmount * multiplier) / 100) * 100;
  }

  private allocateCashAcrossBuckets(
    buckets: Array<{ debt: number; cash: number }>,
    cashAmount: number,
  ) {
    let remainingCash = roundCurrency(Math.max(cashAmount, 0));
    let debtCancelled = 0;

    for (const bucket of buckets) {
      if (remainingCash <= 0 || bucket.cash <= 0 || bucket.debt <= 0) continue;
      const cashPart = Math.min(remainingCash, bucket.cash);
      const debtPart =
        cashPart >= bucket.cash
          ? bucket.debt
          : roundToNearestHundred(cashPart * (bucket.debt / bucket.cash));
      const cappedDebtPart = roundCurrency(Math.min(debtPart, bucket.debt));
      bucket.cash = roundCurrency(Math.max(bucket.cash - cashPart, 0));
      bucket.debt = roundCurrency(Math.max(bucket.debt - cappedDebtPart, 0));
      remainingCash = roundCurrency(remainingCash - cashPart);
      debtCancelled = roundCurrency(debtCancelled + cappedDebtPart);
    }

    return debtCancelled;
  }

  private allocateDebtAcrossBuckets(
    buckets: Array<{ debt: number; cash: number }>,
    debtAmount: number,
  ) {
    let remainingDebt = roundCurrency(Math.max(debtAmount, 0));

    for (const bucket of buckets) {
      if (remainingDebt <= 0 || bucket.debt <= 0) continue;
      const debtPart = Math.min(remainingDebt, bucket.debt);
      const cashPart =
        debtPart >= bucket.debt
          ? bucket.cash
          : roundToNearestHundred(debtPart * (bucket.cash / bucket.debt));
      bucket.debt = roundCurrency(Math.max(bucket.debt - debtPart, 0));
      bucket.cash = roundCurrency(Math.max(bucket.cash - cashPart, 0));
      remainingDebt = roundCurrency(remainingDebt - debtPart);
    }
  }

  private isDiscountedCurrentAccountPayment(paymentMethod?: string | null) {
    return paymentMethod === 'Efectivo' || paymentMethod === 'Transferencia';
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

  async getPaymentReceiptPdf(storeId: number, movementId: number) {
    const movement = await this.prisma.currentAccountMovement.findFirst({
      where: {
        id: movementId,
        storeId,
        type: 'PAYMENT',
      },
      include: {
        store: {
          select: {
            name: true,
            domain: true,
          },
        },
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
        createdByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!movement) {
      throw new NotFoundException('Payment receipt not found');
    }

    const discountMovement = await this.prisma.currentAccountMovement.findFirst({
      where: {
        storeId,
        accountId: movement.accountId,
        type: 'ADJUSTMENT_NEGATIVE',
        description: {
          contains: `(Pago #${movement.id})`,
        },
        cancelledAt: null,
      },
      select: {
        amount: true,
        balanceAfter: true,
      },
    });

    return {
      filename: `recibo-pago-cuenta-${movement.id}.pdf`,
      pdf: this.renderPaymentReceiptPdf({
        ...movement,
        discountAmount: discountMovement
          ? Math.abs(Number(discountMovement.amount))
          : 0,
        finalBalanceAfter: discountMovement?.balanceAfter ?? movement.balanceAfter,
      }),
    };
  }

  async updateCustomer(
    storeId: number,
    customerId: number,
    userId: number | undefined,
    dto: UpdateCurrentAccountDto,
  ) {
    const account = await this.findActiveAccount(storeId, customerId, userId, dto.storeLocationId);
    const customerData = this.buildCustomerUpdateData(dto);

    await this.prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: account.customerId },
        data: customerData,
      });

      await this.syncDefaultAddress(tx, storeId, account.customerId, customerData, dto.address);
    });

    return this.findByCustomer(storeId, userId, customerId, dto.storeLocationId);
  }

  async adjustBalance(
    storeId: number,
    customerId: number,
    createdByUserId: number | undefined,
    dto: AdjustCurrentAccountDto,
  ) {
    const location = await this.resolveUserLocation(storeId, createdByUserId, dto.storeLocationId);

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.currentAccount.findFirst({
        where: {
          storeId,
          customerId,
          storeLocationId: location?.id ?? null,
        },
      });

      if (!account || account.deletedAt) {
        throw new NotFoundException('Current account not found');
      }

      const previousBalance = location
        ? await this.calculateLocalBalanceTx(tx, account.id, location.id)
        : Number(account.balance);
      const nextBalance = roundCurrency(Number(dto.balance));

      if (!Number.isFinite(nextBalance)) {
        throw new BadRequestException('Balance must be a valid number');
      }

      const delta = roundCurrency(nextBalance - previousBalance);

      if (delta === 0) {
        return {
          account,
          movement: null,
        };
      }

      const updatedAccount = await tx.currentAccount.update({
        where: { id: account.id },
        data: {
          balance: roundCurrency(Number(account.balance) + delta),
          ...(location && !account.storeLocationId
            ? { storeLocationId: location.id }
            : {}),
          lastMovementAt: new Date(),
        },
      });

      const movement = await tx.currentAccountMovement.create({
        data: {
          storeId,
          storeLocationId: location?.id ?? null,
          accountId: account.id,
          customerId,
          type: delta >= 0 ? 'ADJUSTMENT_POSITIVE' : 'ADJUSTMENT_NEGATIVE',
          amount: delta,
          paymentMethod: 'Ajuste manual',
          description: dto.description?.trim() || 'Ajuste manual de cuenta corriente',
          createdByUserId,
          balanceAfter: nextBalance,
        },
      });

      return {
        account: updatedAccount,
        movement,
      };
    });
  }

  async deactivate(
    storeId: number,
    customerId: number,
    userId?: number,
    requestedStoreLocationId?: number,
  ) {
    const account = await this.findActiveAccount(storeId, customerId, userId, requestedStoreLocationId);

    return this.prisma.currentAccount.update({
      where: { id: account.id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async reactivate(
    storeId: number,
    customerId: number,
    userId: number | undefined,
    dto: UpdateCurrentAccountDto,
  ) {
    const location = await this.resolveUserLocation(storeId, userId, dto.storeLocationId);
    const account = await this.prisma.currentAccount.findFirst({
      where: {
        storeId,
        customerId,
        storeLocationId: location?.id ?? null,
      },
    });

    if (!account || !account.deletedAt) {
      throw new NotFoundException('Inactive current account not found');
    }

    const customerData = this.buildCustomerUpdateData(dto);

    await this.prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: customerId },
        data: {
          ...customerData,
          source: 'current_account',
        },
      });

      await tx.currentAccount.update({
        where: { id: account.id },
        data: {
          deletedAt: null,
          ...(location ? { storeLocationId: location.id } : {}),
          lastMovementAt: new Date(),
        },
      });

      await this.syncDefaultAddress(tx, storeId, customerId, customerData, dto.address);
    });

    return this.findByCustomer(storeId, userId, customerId, dto.storeLocationId);
  }

  private async findActiveAccount(
    storeId: number,
    customerId: number,
    userId?: number,
    requestedStoreLocationId?: number,
  ) {
    const location = await this.resolveUserLocation(storeId, userId, requestedStoreLocationId);
    const account = await this.prisma.currentAccount.findFirst({
      where: {
        storeId,
        customerId,
        ...(location ? { storeLocationId: location.id } : {}),
      },
      select: {
        id: true,
        customerId: true,
        deletedAt: true,
      },
    });

    if (!account || account.deletedAt) {
      throw new NotFoundException('Current account not found');
    }

    return account;
  }

  private async resolveUserLocation(
    storeId: number,
    userId?: number,
    requestedStoreLocationId?: number,
  ): Promise<AccountLocation> {
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

  private async ensureCorrectionAllowed(storeId: number, userId?: number) {
    if (!userId) {
      throw new ForbiddenException('Only ADMIN and OWNER can correct current account payments');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, storeId },
      select: { role: true },
    });

    if (!['ADMIN', 'OWNER', 'SUPER_ADMIN'].includes(String(user?.role))) {
      throw new ForbiddenException('Only ADMIN and OWNER can correct current account payments');
    }
  }

  private async recalculateMovementBalancesTx(
    tx: any,
    accountId: number,
    storeLocationId: number | null,
  ) {
    const movements = await tx.currentAccountMovement.findMany({
      where: {
        accountId,
        storeLocationId,
      },
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      select: {
        id: true,
        amount: true,
      },
    });
    let runningBalance = 0;

    for (const movement of movements) {
      runningBalance = roundCurrency(runningBalance + Number(movement.amount));
      await tx.currentAccountMovement.update({
        where: { id: movement.id },
        data: { balanceAfter: runningBalance },
      });
    }
  }

  private async withLocalBalance<T extends { id: number; balance: unknown }>(
    account: T,
    storeLocationId: number,
  ): Promise<T & { globalBalance: unknown; balance: number }> {
    const localBalance = await this.calculateLocalBalance(account.id, storeLocationId);

    return {
      ...account,
      globalBalance: account.balance,
      balance: localBalance,
    };
  }

  private async calculateLocalBalance(accountId: number, storeLocationId: number) {
    const result = await this.prisma.currentAccountMovement.aggregate({
      where: {
        accountId,
        storeLocationId,
      },
      _sum: {
        amount: true,
      },
    });

    return roundCurrency(Number(result._sum.amount ?? 0));
  }

  private async calculateLocalBalanceTx(
    tx: any,
    accountId: number,
    storeLocationId: number,
  ) {
    const result = await tx.currentAccountMovement.aggregate({
      where: {
        accountId,
        storeLocationId,
      },
      _sum: {
        amount: true,
      },
    });

    return roundCurrency(Number(result._sum.amount ?? 0));
  }

  private buildCustomerUpdateData(dto: UpdateCurrentAccountDto) {
    const data: Record<string, string | null> = {};

    if (dto.firstName !== undefined) {
      data.firstName = dto.firstName?.trim() || null;
    }

    if (dto.lastName !== undefined) {
      data.lastName = dto.lastName?.trim() || null;
    }

    if (dto.phone !== undefined) {
      data.phone = dto.phone?.trim() || null;
    }

    if (dto.document !== undefined) {
      data.document = dto.document?.trim() || null;
    }

    if (dto.notes !== undefined) {
      data.notes = dto.notes?.trim() || null;
    }

    if (dto.email !== undefined) {
      data.email = dto.email?.trim() ? normalizeEmail(dto.email) : null;
    }

    return data;
  }

  private removeUndefinedCustomerData(data: Record<string, string | null>) {
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );
  }

  private async syncDefaultAddress(
    tx: Prisma.TransactionClient,
    storeId: number,
    customerId: number,
    customerData: Record<string, string | null>,
    rawAddress?: CreateCurrentAccountDto['address'],
  ) {
    const hasAddress = Boolean(
      [
        rawAddress?.address1,
        rawAddress?.address2,
        rawAddress?.city,
        rawAddress?.state,
        rawAddress?.zip,
      ]
        .filter(Boolean)
        .join(' ')
        .trim(),
    );

    if (!hasAddress) {
      return;
    }

    const addressData = {
      firstName: customerData.firstName?.trim() || 'Cliente',
      lastName: customerData.lastName?.trim() || '-',
      phone: customerData.phone?.trim() || null,
      address1: rawAddress?.address1?.trim() || 'Direccion no informada',
      address2: rawAddress?.address2?.trim() || null,
      city: rawAddress?.city?.trim() || 'Sin localidad',
      state: rawAddress?.state?.trim() || null,
      zip: rawAddress?.zip?.trim() || '0000',
      country: 'AR',
      isDefault: true,
    };

    const existingAddress = await tx.customerAddress.findFirst({
      where: {
        storeId,
        customerId,
        isDefault: true,
      },
      select: { id: true },
    });

    if (existingAddress) {
      await tx.customerAddress.update({
        where: { id: existingAddress.id },
        data: addressData,
      });
      return;
    }

    await tx.customerAddress.create({
      data: {
        ...addressData,
        storeId,
        customerId,
      },
    });
  }

  private renderPaymentReceiptPdf(movement: {
    id: number;
    amount: unknown;
    paymentMethod?: string | null;
    description?: string | null;
    createdAt: Date;
    balanceAfter: unknown;
    discountAmount?: number;
    finalBalanceAfter?: unknown;
    store: { name: string; domain: string };
    customer: {
      id: number;
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
      document?: string | null;
    };
    createdByUser?: { name?: string | null; email: string } | null;
  }) {
    const pdf = new SimplePdfDocument();
    const pageWidth = pdf.getPageWidth();
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;
    const issuedAt = new Date(movement.createdAt);
    const customerName = customerDisplayName(movement.customer);
    const amountPaid = Math.abs(Number(movement.amount));
    const discountAmount = Number(movement.discountAmount ?? 0);
    const balanceAfter = Number(movement.finalBalanceAfter ?? movement.balanceAfter);

    pdf.drawText({
      x: margin,
      y: 780,
      text: movement.store.name,
      size: 20,
      font: 'Helvetica-Bold',
    });
    pdf.drawText({
      x: margin,
      y: 758,
      text: movement.store.domain,
      size: 9,
    });
    pdf.drawText({
      x: margin,
      y: 712,
      text: 'RECIBO DE PAGO',
      size: 22,
      font: 'Helvetica-Bold',
    });
    pdf.drawText({
      x: margin,
      y: 690,
      text: `Cuenta corriente - Recibo #${movement.id}`,
      size: 11,
    });
    pdf.drawLine({
      x1: margin,
      y1: 670,
      x2: margin + contentWidth,
      y2: 670,
      lineWidth: 1,
    });

    this.drawReceiptRow(pdf, margin, 632, 'Fecha', issuedAt.toLocaleString('es-AR'));
    this.drawReceiptRow(pdf, margin, 608, 'Cliente', customerName);
    this.drawReceiptRow(pdf, margin, 584, 'Telefono', movement.customer.phone || 'No informado');
    this.drawReceiptRow(pdf, margin, 560, 'Email / Doc.', movement.customer.email || movement.customer.document || 'No informado');
    this.drawReceiptRow(pdf, margin, 536, 'Metodo de pago', movement.paymentMethod || 'No informado');
    this.drawReceiptRow(pdf, margin, 512, 'Registrado por', movement.createdByUser?.name || movement.createdByUser?.email || 'Sistema');

    pdf.drawRect({
      x: margin,
      y: 384,
      width: contentWidth,
      height: 92,
      lineWidth: 1.2,
    });
    pdf.drawText({
      x: margin + 18,
      y: 444,
      text: 'Monto pagado',
      size: 11,
      font: 'Helvetica-Bold',
    });
    pdf.drawText({
      x: margin + 18,
      y: 414,
      text: formatCurrency(amountPaid),
      size: 24,
      font: 'Helvetica-Bold',
    });
    pdf.drawText({
      x: margin + 300,
      y: 444,
      text: discountAmount > 0 ? 'Descuento aplicado' : 'Saldo restante',
      size: 11,
      font: 'Helvetica-Bold',
    });
    pdf.drawText({
      x: margin + 300,
      y: 416,
      text: formatCurrency(discountAmount > 0 ? discountAmount : balanceAfter),
      size: 18,
      font: 'Helvetica-Bold',
    });
    if (discountAmount > 0) {
      pdf.drawText({
        x: margin + 478,
        y: 444,
        text: 'Saldo restante',
        size: 11,
        font: 'Helvetica-Bold',
      });
      pdf.drawText({
        x: margin + 478,
        y: 416,
        text: formatCurrency(balanceAfter),
        size: 18,
        font: 'Helvetica-Bold',
      });
    }

    if (movement.description?.trim()) {
      pdf.drawText({
        x: margin,
        y: 338,
        text: 'Observaciones',
        size: 11,
        font: 'Helvetica-Bold',
      });
      pdf.drawWrappedText({
        x: margin,
        y: 318,
        text: movement.description,
        maxWidth: contentWidth,
        size: 10,
        lineHeight: 14,
      });
    }

    pdf.drawLine({
      x1: margin,
      y1: 120,
      x2: margin + contentWidth,
      y2: 120,
      lineWidth: 0.8,
    });
    pdf.drawText({
      x: margin,
      y: 96,
      text: 'Comprobante no fiscal de pago de cuenta corriente.',
      size: 9,
    });

    return pdf.save();
  }

  private drawReceiptRow(
    pdf: SimplePdfDocument,
    x: number,
    y: number,
    label: string,
    value: string,
  ) {
    pdf.drawText({ x, y, text: label, size: 9, font: 'Helvetica-Bold' });
    pdf.drawWrappedText({
      x: x + 120,
      y,
      text: value,
      maxWidth: 360,
      size: 10,
      lineHeight: 13,
    });
  }
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizePhone(value?: string | null) {
  return (value ?? '').replace(/\D/g, '');
}

function customerDisplayName(customer: {
  id: number;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}) {
  return (
    [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() ||
    customer.email ||
    customer.phone ||
    `Cliente #${customer.id}`
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}
