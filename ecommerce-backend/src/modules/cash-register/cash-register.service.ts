import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SimplePdfDocument } from '../../common/utils/pdf-document';
import { PrismaService } from '../../prisma/prisma.service';
import { CloseCashRegisterDto } from './dto/close-cash-register.dto';
import { OpenCashRegisterDto } from './dto/open-cash-register.dto';
import { UpdateCashRegisterConfigDto } from './dto/update-cash-register-config.dto';

type CashRegisterMode = 'automatic' | 'manual';

type CashMovement = {
  id: string;
  kind: 'sale_payment' | 'current_account_payment';
  createdAt: Date;
  method: string;
  amount: number;
  description: string;
  orderId?: number | null;
  customerName?: string | null;
};

@Injectable()
export class CashRegisterService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { cashRegisterMode: true },
    });

    return {
      mode: this.normalizeMode(store?.cashRegisterMode),
    };
  }

  async updateConfig(storeId: number, dto: UpdateCashRegisterConfigDto) {
    const store = await this.prisma.store.update({
      where: { id: storeId },
      data: { cashRegisterMode: dto.mode },
      select: { cashRegisterMode: true },
    });

    return {
      mode: this.normalizeMode(store.cashRegisterMode),
    };
  }

  async getCurrent(storeId: number) {
    const { mode } = await this.getConfig(storeId);

    if (mode === 'automatic') {
      const session = await this.ensureAutomaticSession(storeId);
      return this.withSummary(session);
    }

    const session = await this.prisma.cashRegisterSession.findFirst({
      where: {
        storeId,
        mode: 'manual',
        closedAt: null,
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!session) {
      return { mode, session: null, summary: null };
    }

    return this.withSummary(session);
  }

  async openManual(storeId: number, userId: number | undefined, dto: OpenCashRegisterDto) {
    const { mode } = await this.getConfig(storeId);

    if (mode !== 'manual') {
      throw new BadRequestException('La caja manual no esta configurada para esta tienda.');
    }

    const current = await this.prisma.cashRegisterSession.findFirst({
      where: { storeId, mode: 'manual', closedAt: null },
      select: { id: true },
    });

    if (current) {
      throw new BadRequestException('Ya hay una caja manual abierta.');
    }

    const session = await this.prisma.cashRegisterSession.create({
      data: {
        storeId,
        mode: 'manual',
        openingAmount: this.roundMoney(Number(dto.openingAmount ?? 0)),
        openedByUserId: userId,
        notes: dto.notes?.trim() || null,
      },
    });

    return this.withSummary(session);
  }

  async closeManual(storeId: number, userId: number | undefined, dto: CloseCashRegisterDto) {
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { storeId, mode: 'manual', closedAt: null },
      orderBy: { openedAt: 'desc' },
    });

    if (!session) {
      throw new NotFoundException('No hay una caja manual abierta.');
    }

    const summary = await this.buildSummary(session);
    const closingAmount = this.roundMoney(Number(dto.closingAmount ?? 0));
    const expectedAmount = summary.expectedAmount;
    const closedSession = await this.prisma.cashRegisterSession.update({
      where: { id: session.id },
      data: {
        closedAt: new Date(),
        closedByUserId: userId,
        closingAmount,
        expectedAmount,
        receivedAmount: summary.receivedTotal,
        differenceAmount: this.roundMoney(closingAmount - expectedAmount),
        notes: dto.notes?.trim() || session.notes,
        summary: this.toStoredSummary(summary),
      },
    });

    return this.withSummary(closedSession);
  }

  async getHistory(storeId: number) {
    const sessions = await this.prisma.cashRegisterSession.findMany({
      where: { storeId },
      orderBy: { openedAt: 'desc' },
      take: 60,
    });

    return Promise.all(sessions.map((session) => this.withSummary(session)));
  }

  async getClosurePdf(storeId: number, sessionId?: number) {
    const session = sessionId
      ? await this.prisma.cashRegisterSession.findFirst({
          where: { id: sessionId, storeId },
        })
      : await this.resolveCurrentPrintableSession(storeId);

    if (!session) {
      throw new NotFoundException('Cash register session not found');
    }

    if (session.mode === 'manual' && !session.closedAt) {
      throw new BadRequestException('La caja manual debe estar cerrada para descargar el cierre.');
    }

    const summary = await this.buildSummary(session);
    const pdf = this.buildTicketPdf(session, summary);

    return {
      filename: `cierre-caja-${session.id}.pdf`,
      pdf,
    };
  }

  private async ensureAutomaticSession(storeId: number) {
    const { start } = this.getBuenosAiresDayRange(new Date());
    const existing = await this.prisma.cashRegisterSession.findFirst({
      where: {
        storeId,
        mode: 'automatic',
        businessDate: start,
      },
      orderBy: { openedAt: 'desc' },
    });

    if (existing) return existing;

    return this.prisma.cashRegisterSession.create({
      data: {
        storeId,
        mode: 'automatic',
        businessDate: start,
        openingAmount: 0,
        openedAt: start,
      },
    });
  }

  private async resolveCurrentPrintableSession(storeId: number) {
    const { mode } = await this.getConfig(storeId);

    if (mode === 'automatic') {
      return this.ensureAutomaticSession(storeId);
    }

    return this.prisma.cashRegisterSession.findFirst({
      where: { storeId, mode: 'manual', closedAt: { not: null } },
      orderBy: { closedAt: 'desc' },
    });
  }

  private async withSummary(session: any) {
    const summary = await this.buildSummary(session);
    return {
      mode: this.normalizeMode(session.mode),
      session,
      summary,
    };
  }

  private async buildSummary(session: any) {
    const range = this.getSessionRange(session);
    const [payments, accountPayments] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          storeId: session.storeId,
          createdAt: {
            gte: range.start,
            lt: range.end,
          },
          status: { in: ['approved', 'paid'] },
        },
        include: {
          order: {
            select: {
              id: true,
              customerFirstNameSnapshot: true,
              customerLastNameSnapshot: true,
              customer: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.currentAccountMovement.findMany({
        where: {
          storeId: session.storeId,
          type: 'PAYMENT',
          createdAt: {
            gte: range.start,
            lt: range.end,
          },
        },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
    ]);

    const movements: CashMovement[] = [
      ...payments.map((payment) => ({
        id: `payment-${payment.id}`,
        kind: 'sale_payment' as const,
        createdAt: payment.createdAt,
        method: payment.method?.trim() || payment.provider || 'Pago',
        amount: Number(payment.amount),
        description: `Venta #${payment.orderId}`,
        orderId: payment.orderId,
        customerName:
          this.joinName(
            payment.order.customerFirstNameSnapshot,
            payment.order.customerLastNameSnapshot,
          ) || this.customerName(payment.order.customer),
      })),
      ...accountPayments.map((movement) => ({
        id: `account-${movement.id}`,
        kind: 'current_account_payment' as const,
        createdAt: movement.createdAt,
        method: movement.paymentMethod?.trim() || 'Pago',
        amount: Math.abs(Number(movement.amount)),
        description: movement.description || 'Pago de cuenta corriente',
        orderId: movement.orderId,
        customerName: this.customerName(movement.customer),
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const byMethod = movements.reduce<Record<string, number>>((acc, movement) => {
      const key = movement.method || 'Sin metodo';
      acc[key] = this.roundMoney((acc[key] ?? 0) + movement.amount);
      return acc;
    }, {});
    const receivedTotal = this.roundMoney(
      movements.reduce((sum, movement) => sum + movement.amount, 0),
    );
    const openingAmount = Number(session.openingAmount ?? 0);

    return {
      range,
      openingAmount,
      receivedTotal,
      expectedAmount: this.roundMoney(openingAmount + receivedTotal),
      movementCount: movements.length,
      byMethod,
      movements,
    };
  }

  private getSessionRange(session: any) {
    if (session.mode === 'automatic') {
      const businessDate = session.businessDate
        ? new Date(session.businessDate)
        : new Date(session.openedAt);
      return this.getBuenosAiresDayRange(businessDate);
    }

    return {
      start: new Date(session.openedAt),
      end: session.closedAt ? new Date(session.closedAt) : new Date(),
    };
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

  private normalizeMode(mode?: string | null): CashRegisterMode {
    return mode === 'manual' ? 'manual' : 'automatic';
  }

  private customerName(customer?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null) {
    return (
      this.joinName(customer?.firstName, customer?.lastName) ||
      customer?.email ||
      customer?.phone ||
      null
    );
  }

  private joinName(first?: string | null, last?: string | null) {
    return [first, last].filter(Boolean).join(' ').trim();
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private toStoredSummary(summary: any) {
    return {
      ...summary,
      range: {
        start: summary.range.start.toISOString(),
        end: summary.range.end.toISOString(),
      },
      movements: summary.movements.map((movement: CashMovement) => ({
        ...movement,
        createdAt: movement.createdAt.toISOString(),
      })),
    };
  }

  private buildTicketPdf(session: any, summary: any) {
    const width = 226;
    const movementHeight = Math.max(summary.movements.length, 1) * 36;
    const methodHeight = Math.max(Object.keys(summary.byMethod).length, 1) * 16;
    const height = Math.max(520, 330 + movementHeight + methodHeight);
    const pdf = new SimplePdfDocument(width, height);
    const margin = 14;
    const contentWidth = width - margin * 2;
    let y = height - 24;

    const line = () => {
      pdf.drawLine({ x1: margin, y1: y, x2: width - margin, y2: y, lineWidth: 0.5 });
      y -= 12;
    };
    const text = (value: string, size = 8, bold = false) => {
      pdf.drawText({
        x: margin,
        y,
        text: value,
        size,
        font: bold ? 'Helvetica-Bold' : 'Helvetica',
      });
      y -= size + 5;
    };
    const row = (label: string, value: string, bold = false) => {
      pdf.drawText({
        x: margin,
        y,
        text: label,
        size: 8,
        font: bold ? 'Helvetica-Bold' : 'Helvetica',
      });
      pdf.drawText({
        x: margin + 112,
        y,
        text: value,
        size: 8,
        font: bold ? 'Helvetica-Bold' : 'Helvetica',
      });
      y -= 14;
    };

    text('CIERRE DE CAJA', 13, true);
    text(session.mode === 'manual' ? `Caja manual #${session.id}` : `Caja diaria #${session.id}`, 9, true);
    text(`Apertura: ${this.formatDate(session.openedAt)}`, 7);
    if (session.closedAt) {
      text(`Cierre: ${this.formatDate(session.closedAt)}`, 7);
    }
    line();

    if (session.mode === 'manual') {
      row('Apertura', this.formatMoney(summary.openingAmount));
    }
    row('Recibido', this.formatMoney(summary.receivedTotal), true);
    if (session.mode === 'manual') {
      row('Total esperado', this.formatMoney(summary.expectedAmount), true);
      if (session.closingAmount !== null && session.closingAmount !== undefined) {
        row('Contado', this.formatMoney(Number(session.closingAmount)));
        row('Diferencia', this.formatMoney(Number(session.differenceAmount ?? 0)));
      }
    }
    row('Movimientos', String(summary.movementCount));
    line();

    text('POR MEDIO DE PAGO', 8, true);
    const methods = Object.entries(summary.byMethod) as Array<[string, number]>;
    if (!methods.length) {
      text('Sin movimientos', 8);
    } else {
      methods.forEach(([method, amount]) => row(method, this.formatMoney(Number(amount))));
    }
    line();

    text('MOVIMIENTOS', 8, true);
    if (!summary.movements.length) {
      text('Sin movimientos', 8);
    } else {
      summary.movements.forEach((movement: CashMovement) => {
        const nextY = pdf.drawWrappedText({
          x: margin,
          y,
          text: `${this.formatDate(movement.createdAt)} - ${movement.method}`,
          maxWidth: contentWidth,
          size: 7,
          lineHeight: 9,
        });
        y = (nextY ?? y - 9) - 1;
        const detailY = pdf.drawWrappedText({
          x: margin,
          y,
          text: `${movement.description}${movement.customerName ? ` - ${movement.customerName}` : ''}`,
          maxWidth: contentWidth,
          size: 7,
          lineHeight: 9,
          font: 'Helvetica-Bold',
        });
        y = (detailY ?? y - 9) - 1;
        row('Importe', this.formatMoney(movement.amount), true);
      });
    }

    line();
    text('Generado desde el panel administrativo.', 7);

    return pdf.save();
  }

  private formatMoney(value: number) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private formatDate(value: Date | string) {
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}
