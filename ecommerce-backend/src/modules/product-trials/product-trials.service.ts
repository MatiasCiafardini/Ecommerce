import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InventoryLockService } from '../inventory-lock/inventory-lock.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductTrialDto } from './dto/create-product-trial.dto';

const trialInclude = {
  createdByUser: { select: { id: true, name: true, email: true } },
  items: {
    orderBy: { id: 'asc' as const },
    include: {
      order: { select: { id: true, status: true, total: true, createdAt: true } },
      variant: {
        include: {
          product: { select: { id: true, title: true, images: { orderBy: { position: 'asc' as const }, take: 1 } } },
        },
      },
    },
  },
  events: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.ProductTrialInclude;

@Injectable()
export class ProductTrialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryLockService: InventoryLockService,
  ) {}

  async findByAccount(storeId: number, accountId: number) {
    await this.ensureAccount(storeId, accountId);
    return this.prisma.productTrial.findMany({
      where: { storeId, accountId },
      include: trialInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async findPending(storeId: number, storeLocationId?: number) {
    if (storeLocationId !== undefined && (!Number.isInteger(storeLocationId) || storeLocationId <= 0)) {
      throw new BadRequestException('El local seleccionado no es valido.');
    }

    return this.prisma.productTrialItem.findMany({
      where: {
        storeId,
        status: 'pending',
        ...(storeLocationId ? { trial: { storeLocationId } } : {}),
      },
      orderBy: [{ trial: { createdAt: 'asc' } }, { id: 'asc' }],
      include: {
        trial: {
          include: {
            account: { select: { id: true } },
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        variant: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                images: { orderBy: { position: 'asc' }, take: 1 },
              },
            },
          },
        },
      },
    });
  }

  async create(storeId: number, accountId: number, userId: number | undefined, dto: CreateProductTrialDto) {
    const account = await this.ensureAccount(storeId, accountId);
    return this.prisma.$transaction(async (tx) => {
      const trial = await tx.productTrial.create({
        data: {
          storeId,
          storeLocationId: account.storeLocationId,
          accountId: account.id,
          customerId: account.customerId,
          notes: dto.notes?.trim() || null,
          createdByUserId: userId,
        },
      });

      const createdItemIds: number[] = [];
      for (const requested of dto.items) {
        const variant = await tx.productVariant.findFirst({
          where: { id: requested.variantId, deletedAt: null, product: { storeId } },
          select: { id: true },
        });
        if (!variant) throw new NotFoundException(`Variant ${requested.variantId} not found`);

        await this.inventoryLockService.reserveStockTx(tx, storeId, requested.variantId, requested.quantity);
        for (let unit = 0; unit < requested.quantity; unit += 1) {
          const item = await tx.productTrialItem.create({
            data: { storeId, trialId: trial.id, variantId: requested.variantId, price: requested.price },
          });
          createdItemIds.push(item.id);
        }
      }

      await tx.productTrialEvent.create({
        data: {
          storeId,
          trialId: trial.id,
          type: 'trial.created',
          actorId: userId,
          metadata: { itemIds: createdItemIds, notes: dto.notes?.trim() || null },
        },
      });

      return tx.productTrial.findUniqueOrThrow({ where: { id: trial.id }, include: trialInclude });
    });
  }

  async returnItems(storeId: number, accountId: number, userId: number | undefined, itemIds: number[]) {
    await this.ensureAccount(storeId, accountId);
    const uniqueIds = [...new Set(itemIds)];
    return this.prisma.$transaction(async (tx) => {
      const items = await tx.productTrialItem.findMany({
        where: { id: { in: uniqueIds }, storeId, status: 'pending', trial: { accountId } },
      });
      if (items.length !== uniqueIds.length) {
        throw new BadRequestException('Una o mas prendas ya fueron resueltas o no pertenecen a esta cuenta.');
      }

      const now = new Date();
      for (const item of items) {
        const claimed = await tx.productTrialItem.updateMany({
          where: { id: item.id, status: 'pending' },
          data: { status: 'returned', resolvedAt: now, resolvedByUserId: userId },
        });
        if (claimed.count !== 1) throw new BadRequestException('La prenda ya fue resuelta.');
        await this.inventoryLockService.releaseStockTx(tx, storeId, item.variantId, 1);
      }

      for (const trialId of [...new Set(items.map((item) => item.trialId))]) {
        await tx.productTrialEvent.create({
          data: { storeId, trialId, type: 'trial.items_returned', actorId: userId, metadata: { itemIds: items.filter((item) => item.trialId === trialId).map((item) => item.id) } },
        });
        await this.completeTrialIfResolved(tx, trialId);
      }

      return { returnedItemIds: uniqueIds };
    });
  }

  private async ensureAccount(storeId: number, accountId: number) {
    const account = await this.prisma.currentAccount.findFirst({ where: { id: accountId, storeId, deletedAt: null } });
    if (!account) throw new NotFoundException('Cuenta corriente no encontrada o inactiva.');
    return account;
  }

  private async completeTrialIfResolved(tx: Prisma.TransactionClient, trialId: number) {
    const pending = await tx.productTrialItem.count({ where: { trialId, status: 'pending' } });
    if (pending === 0) {
      await tx.productTrial.update({ where: { id: trialId }, data: { status: 'completed', completedAt: new Date() } });
    }
  }
}
