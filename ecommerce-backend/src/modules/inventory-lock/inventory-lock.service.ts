import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { InventoryMovementService, type InventoryMovementContext } from './inventory-movement.service';

@Injectable()
export class InventoryLockService {
  constructor(private prisma: PrismaService, @Optional() private movements?: InventoryMovementService) {}

  async reserveStock(storeId: number, variantId: number, quantity: number) {
    return this.prisma.$transaction((tx) => this.reserveStockTx(tx, storeId, variantId, quantity));
  }

  async reserveStockTx(tx: Prisma.TransactionClient, storeId: number, variantId: number, quantity: number, context?: Partial<InventoryMovementContext>) {
    this.assertPositiveQuantity(quantity);
    if (this.movements) {
      return this.movements.adjustTx(tx, storeId, variantId, 0, quantity, { type: 'RESERVATION', origin: 'system', ...context });
    }
    const before = await this.getInventory(tx, storeId, variantId);
    if (before.quantity - before.reserved < quantity) throw new BadRequestException('Not enough stock available');
    const updated = await tx.inventory.update({
      where: { storeId_variantId: { storeId, variantId } },
      data: { reserved: { increment: quantity } },
    });
    return updated;
  }

  async releaseStock(storeId: number, variantId: number, quantity: number) {
    return this.prisma.$transaction((tx) => this.releaseStockTx(tx, storeId, variantId, quantity));
  }

  async releaseStockTx(tx: Prisma.TransactionClient, storeId: number, variantId: number, quantity: number, context?: Partial<InventoryMovementContext>) {
    this.assertPositiveQuantity(quantity);
    if (this.movements) {
      return this.movements.adjustTx(tx, storeId, variantId, 0, -quantity, { type: 'RESERVATION_RELEASE', origin: 'system', ...context });
    }
    const before = await this.getInventory(tx, storeId, variantId);
    if (before.reserved < quantity) throw new BadRequestException('Invalid reserved stock');
    const updated = await tx.inventory.update({
      where: { storeId_variantId: { storeId, variantId } },
      data: { reserved: { decrement: quantity } },
    });
    return updated;
  }

  async confirmStock(storeId: number, variantId: number, quantity: number) {
    return this.prisma.$transaction((tx) => this.confirmStockTx(tx, storeId, variantId, quantity));
  }

  async confirmStockTx(tx: Prisma.TransactionClient, storeId: number, variantId: number, quantity: number, context?: Partial<InventoryMovementContext>) {
    this.assertPositiveQuantity(quantity);
    if (this.movements) {
      return this.movements.adjustTx(tx, storeId, variantId, -quantity, -quantity, { type: 'SALE', origin: 'system', ...context });
    }
    const before = await this.getInventory(tx, storeId, variantId);
    if (before.reserved < quantity) throw new BadRequestException('Invalid reserved stock');
    const updated = await tx.inventory.update({
      where: { storeId_variantId: { storeId, variantId } },
      data: { quantity: { decrement: quantity }, reserved: { decrement: quantity } },
    });
    return updated;
  }

  private async getInventory(tx: Prisma.TransactionClient, storeId: number, variantId: number) {
    const inventory = await tx.inventory.findUnique({ where: { storeId_variantId: { storeId, variantId } } });
    if (!inventory) throw new BadRequestException('Inventory not found');
    return inventory;
  }

  private assertPositiveQuantity(quantity: number) {
    if (!Number.isInteger(quantity) || quantity <= 0) throw new BadRequestException('Quantity must be a positive integer');
  }
}
