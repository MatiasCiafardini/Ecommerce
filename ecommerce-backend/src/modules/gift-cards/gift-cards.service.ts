import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GiftCardStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AdjustGiftCardDto } from './dto/adjust-gift-card.dto';
import { GiftCardQueryDto } from './dto/gift-card-query.dto';

const detailInclude = {
  orderItem: { select: { orderId: true } },
  issuedAtLocation: { select: { id: true, name: true } },
  issuedByUser: { select: { id: true, name: true, email: true } },
  movements: {
    orderBy: { createdAt: 'desc' as const },
    include: { order: { select: { id: true } } },
  },
} as const;

@Injectable()
export class GiftCardsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(storeId: number, query: GiftCardQueryDto) {
    const search = query.search?.trim();
    const cards = await this.prisma.giftCard.findMany({
      where: {
        storeId,
        ...(query.status ? { status: query.status } : {}),
        ...(search
          ? {
              OR: [
                { code: { equals: this.normalizeCode(search), mode: 'insensitive' as const } },
                { codeLastFour: { equals: search.slice(-4), mode: 'insensitive' as const } },
                { purchaserName: { contains: search, mode: 'insensitive' as const } },
                { recipientName: { contains: search, mode: 'insensitive' as const } },
                { purchaserEmail: { contains: search, mode: 'insensitive' as const } },
                { recipientEmail: { contains: search, mode: 'insensitive' as const } },
                { purchaserPhone: { contains: search, mode: 'insensitive' as const } },
                { recipientPhone: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: {
        orderItem: { select: { orderId: true } },
        issuedAtLocation: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return cards.map((card) => ({
      ...card,
      code: this.maskCode(card.code),
      expired: this.isExpired(card.expiresAt),
    }));
  }

  async stats(storeId: number) {
    const [cards, active, redeemed] = await Promise.all([
      this.prisma.giftCard.aggregate({
        where: { storeId },
        _count: { id: true },
        _sum: { initialAmount: true },
      }),
      this.prisma.giftCard.aggregate({
        where: {
          storeId,
          status: 'ACTIVE',
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
        _sum: { balance: true },
      }),
      this.prisma.giftCardMovement.aggregate({
        where: { storeId, type: 'REDEEM' },
        _sum: { amount: true },
      }),
    ]);
    return {
      count: cards._count.id,
      issuedTotal: Number(cards._sum.initialAmount ?? 0),
      activeBalance: Number(active._sum.balance ?? 0),
      redeemedTotal: Number(redeemed._sum.amount ?? 0),
    };
  }

  async findOne(storeId: number, id: number) {
    const card = await this.prisma.giftCard.findFirst({
      where: { id, storeId },
      include: detailInclude,
    });
    if (!card) throw new NotFoundException('Gift card not found');
    return { ...card, expired: this.isExpired(card.expiresAt) };
  }

  async lookup(storeId: number, code: string) {
    const card = await this.prisma.giftCard.findFirst({
      where: { storeId, code: this.normalizeCode(code) },
      include: { movements: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    if (!card) throw new NotFoundException('No encontramos una gift card con ese codigo.');
    if (card.status !== GiftCardStatus.ACTIVE || Number(card.balance) <= 0) {
      throw new BadRequestException('La gift card no tiene saldo disponible.');
    }
    if (this.isExpired(card.expiresAt)) {
      throw new BadRequestException('La gift card esta vencida.');
    }
    return card;
  }

  async cancel(storeId: number, id: number, userId: number | undefined, reason: string) {
    await this.ensureManager(storeId, userId);
    return this.prisma.$transaction(async (tx) => {
      const card = await tx.giftCard.findFirst({
        where: { id, storeId },
        include: { movements: true },
      });
      if (!card) throw new NotFoundException('Gift card not found');
      if (card.status === 'CANCELLED') return card;
      if (card.movements.some((movement) => movement.type === 'REDEEM')) {
        throw new BadRequestException('No se puede cancelar una gift card que ya fue utilizada.');
      }
      const before = Number(card.balance);
      const updated = await tx.giftCard.update({
        where: { id },
        data: { status: 'CANCELLED', balance: 0 },
      });
      await tx.giftCardMovement.create({
        data: {
          storeId,
          giftCardId: id,
          type: 'CANCEL',
          amount: before,
          balanceBefore: before,
          balanceAfter: 0,
          actorUserId: userId,
          reason: reason.trim(),
          idempotencyKey: `gift-card:${id}:cancel`,
        },
      });
      return updated;
    });
  }

  async adjust(storeId: number, id: number, userId: number | undefined, dto: AdjustGiftCardDto) {
    await this.ensureManager(storeId, userId);
    return this.prisma.$transaction(async (tx) => {
      const card = await tx.giftCard.findFirst({ where: { id, storeId } });
      if (!card) throw new NotFoundException('Gift card not found');
      if (card.status === 'CANCELLED') throw new BadRequestException('La gift card esta cancelada.');
      const before = Number(card.balance);
      const after = this.round(dto.balance);
      const updated = await tx.giftCard.update({
        where: { id },
        data: { balance: after, status: after > 0 ? 'ACTIVE' : 'REDEEMED' },
      });
      await tx.giftCardMovement.create({
        data: {
          storeId,
          giftCardId: id,
          type: 'ADJUSTMENT',
          amount: Math.abs(after - before),
          balanceBefore: before,
          balanceAfter: after,
          actorUserId: userId,
          reason: dto.reason.trim(),
        },
      });
      return updated;
    });
  }

  private async ensureManager(storeId: number, userId?: number) {
    const user = userId
      ? await this.prisma.user.findFirst({ where: { id: userId, storeId }, select: { role: true } })
      : null;
    if (!user || !['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Only ADMIN and OWNER can manage gift cards');
    }
  }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase().replace(/\s+/g, '');
  }

  private maskCode(code: string) {
    return `•••• ${code.slice(-4)}`;
  }

  private isExpired(value?: Date | null) {
    return Boolean(value && value.getTime() < Date.now());
  }

  private round(value: number) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }
}
