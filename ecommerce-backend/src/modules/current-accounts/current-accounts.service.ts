import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class CurrentAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(storeId: number, dto: CreateCurrentAccountDto) {
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
          customerId: savedCustomer.id,
          balance: 0,
        },
        update: {
          deletedAt: null,
          lastMovementAt: new Date(),
        },
      });

      return savedCustomer;
    });

    return this.findByCustomer(storeId, customer.id);
  }

  async findAll(storeId: number, status: 'debt' | 'paid' | 'all' = 'debt', search = '') {
    const normalizedSearch = search.trim();

    const balanceFilter =
      status === 'debt'
        ? { gt: 0 }
        : status === 'paid'
          ? { equals: 0 }
          : undefined;

    return this.prisma.currentAccount.findMany({
      where: {
        storeId,
        deletedAt: null,
        ...(balanceFilter ? { balance: balanceFilter } : {}),
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
  }

  async findByCustomer(storeId: number, customerId: number) {
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

    return account;
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
      const amount = Number(dto.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('Payment amount must be greater than 0');
      }

      if (amount > currentBalance) {
        throw new BadRequestException('Payment cannot exceed current balance');
      }

      const nextBalance = roundCurrency(currentBalance - amount);

      const updatedAccount = await tx.currentAccount.update({
        where: { id: account.id },
        data: {
          balance: nextBalance,
          lastMovementAt: new Date(),
        },
      });

      const movement = await tx.currentAccountMovement.create({
        data: {
          storeId,
          accountId: account.id,
          customerId,
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
    dto: UpdateCurrentAccountDto,
  ) {
    const account = await this.findActiveAccount(storeId, customerId);

    await this.prisma.customer.update({
      where: { id: account.customerId },
      data: this.buildCustomerUpdateData(dto),
    });

    return this.findByCustomer(storeId, customerId);
  }

  async adjustBalance(
    storeId: number,
    customerId: number,
    createdByUserId: number | undefined,
    dto: AdjustCurrentAccountDto,
  ) {
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

      const previousBalance = Number(account.balance);
      const nextBalance = roundCurrency(Number(dto.balance));

      if (!Number.isFinite(nextBalance) || nextBalance < 0) {
        throw new BadRequestException('Balance must be zero or greater');
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
          balance: nextBalance,
          lastMovementAt: new Date(),
        },
      });

      const movement = await tx.currentAccountMovement.create({
        data: {
          storeId,
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
    dto: UpdateCurrentAccountDto,
  ) {
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

    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId },
        data: {
          ...customerData,
          source: 'current_account',
        },
      }),
      this.prisma.currentAccount.update({
        where: { id: account.id },
        data: {
          deletedAt: null,
          lastMovementAt: new Date(),
        },
      }),
    ]);

    return this.findByCustomer(storeId, customerId);
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
