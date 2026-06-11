import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SimplePdfDocument } from '../../common/utils/pdf-document';
import { normalizeEmail } from '../../common/utils/email.util';
import { AdjustCurrentAccountDto } from './dto/adjust-current-account.dto';
import { CreateCurrentAccountDto } from './dto/create-current-account.dto';
import { RegisterCurrentAccountPaymentDto } from './dto/register-current-account-payment.dto';
import { UpdateCurrentAccountDto } from './dto/update-current-account.dto';

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
    const location = await this.resolveUserLocation(storeId, userId);
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

      await tx.currentAccount.upsert({
        where: {
          storeId_customerId: {
            storeId,
            customerId: savedCustomer.id,
          },
        },
        create: {
          storeId,
          storeLocationId: location?.id ?? null,
          customerId: savedCustomer.id,
          balance: 0,
        },
        update: {
          deletedAt: null,
          ...(location ? { storeLocationId: location.id } : {}),
          lastMovementAt: new Date(),
        },
      });

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
  ) {
    const location = await this.resolveUserLocation(storeId, userId);
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

  async findByCustomer(storeId: number, userId: number | undefined, customerId: number) {
    const location = await this.resolveUserLocation(storeId, userId);
    const account = await this.prisma.currentAccount.findUnique({
      where: {
        storeId_customerId: {
          storeId,
          customerId,
        },
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
    const cashContext = await this.resolveCashContext(storeId, createdByUserId);

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.currentAccount.findUnique({
        where: {
          storeId_customerId: {
            storeId,
            customerId,
          },
        },
      });

      if (!account || account.deletedAt) {
        throw new NotFoundException('Current account not found');
      }

      const currentBalance = Number(account.balance);
      const currentLocalBalance = cashContext.storeLocationId
        ? await this.calculateLocalBalanceTx(tx, account.id, cashContext.storeLocationId)
        : currentBalance;
      const amount = Number(dto.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('Payment amount must be greater than 0');
      }

      if (amount > currentLocalBalance) {
        throw new BadRequestException('Payment cannot exceed current balance');
      }

      const nextBalance = roundCurrency(currentBalance - amount);

      const updatedAccount = await tx.currentAccount.update({
        where: { id: account.id },
        data: {
          balance: nextBalance,
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
          balanceAfter: nextBalance,
        },
      });

      return {
        account: updatedAccount,
        movement,
      };
    });
  }

  private async resolveCashContext(storeId: number, userId?: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { cashRegisterMode: true },
    });

    if (store?.cashRegisterMode !== 'manual') {
      return {
        storeLocationId: null as number | null,
        cashRegisterId: null as number | null,
      };
    }

    const user = userId
      ? await this.prisma.user.findFirst({
          where: { id: userId, storeId },
          select: {
            storeLocation: {
              select: {
                id: true,
                name: true,
                active: true,
              },
            },
          },
        })
      : null;
    const location = user?.storeLocation?.active ? user.storeLocation : null;

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
    };
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

    return {
      filename: `recibo-pago-cuenta-${movement.id}.pdf`,
      pdf: this.renderPaymentReceiptPdf(movement),
    };
  }

  async updateCustomer(
    storeId: number,
    customerId: number,
    userId: number | undefined,
    dto: UpdateCurrentAccountDto,
  ) {
    const account = await this.findActiveAccount(storeId, customerId);
    const customerData = this.buildCustomerUpdateData(dto);

    await this.prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: account.customerId },
        data: customerData,
      });

      await this.syncDefaultAddress(tx, storeId, account.customerId, customerData, dto.address);
    });

    return this.findByCustomer(storeId, userId, customerId);
  }

  async adjustBalance(
    storeId: number,
    customerId: number,
    createdByUserId: number | undefined,
    dto: AdjustCurrentAccountDto,
  ) {
    const location = await this.resolveUserLocation(storeId, createdByUserId);

    return this.prisma.$transaction(async (tx) => {
      const account = await tx.currentAccount.findUnique({
        where: {
          storeId_customerId: {
            storeId,
            customerId,
          },
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

  async deactivate(storeId: number, customerId: number) {
    const account = await this.findActiveAccount(storeId, customerId);

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
    const location = await this.resolveUserLocation(storeId, userId);
    const account = await this.prisma.currentAccount.findUnique({
      where: {
        storeId_customerId: {
          storeId,
          customerId,
        },
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

    return this.findByCustomer(storeId, userId, customerId);
  }

  private async findActiveAccount(storeId: number, customerId: number) {
    const account = await this.prisma.currentAccount.findUnique({
      where: {
        storeId_customerId: {
          storeId,
          customerId,
        },
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
  ): Promise<AccountLocation> {
    if (!userId) {
      return null;
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, storeId },
      select: {
        storeLocation: {
          select: {
            id: true,
            name: true,
            active: true,
          },
        },
      },
    });

    return user?.storeLocation?.active ? user.storeLocation : null;
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
    const balanceAfter = Number(movement.balanceAfter);

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
      text: 'Saldo restante',
      size: 11,
      font: 'Helvetica-Bold',
    });
    pdf.drawText({
      x: margin + 300,
      y: 416,
      text: formatCurrency(balanceAfter),
      size: 18,
      font: 'Helvetica-Bold',
    });

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
