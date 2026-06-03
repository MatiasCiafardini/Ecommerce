import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryLockService {
  constructor(private prisma: PrismaService) {}

  /*
    Wrapper para usar fuera de una transacción
  */
  async reserveStock(storeId: number, variantId: number, quantity: number) {
    return this.prisma.$transaction((tx) =>
      this.reserveStockTx(tx, storeId, variantId, quantity),
    );
  }

  /*
    Usado dentro de una transacción existente
  */
  async reserveStockTx(
    tx: Prisma.TransactionClient,
    storeId: number,
    variantId: number,
    quantity: number,
  ) {
    const rows: any[] = await tx.$queryRawUnsafe(
      `
      SELECT *
      FROM "Inventory"
      WHERE "variantId" = $1
      AND "storeId" = $2
      FOR UPDATE
      `,
      variantId,
      storeId,
    );

    if (!rows.length) {
      throw new BadRequestException('Inventory not found');
    }

    const inventory = rows[0];

    const available = inventory.quantity - inventory.reserved;

    if (available < quantity) {
      throw new BadRequestException('Not enough stock available');
    }

    return tx.inventory.update({
      where: {
        storeId_variantId: {
          storeId,
          variantId,
        },
      },
      data: {
        reserved: {
          increment: quantity,
        },
      },
    });
  }

  /*
    Wrapper
  */
  async releaseStock(storeId: number, variantId: number, quantity: number) {
    return this.prisma.$transaction((tx) =>
      this.releaseStockTx(tx, storeId, variantId, quantity),
    );
  }

  /*
    Usado dentro de transacción existente
  */
  async releaseStockTx(
    tx: Prisma.TransactionClient,
    storeId: number,
    variantId: number,
    quantity: number,
  ) {
    const inventory = await tx.inventory.findUnique({
      where: {
        storeId_variantId: {
          storeId,
          variantId,
        },
      },
    });

    if (!inventory) {
      throw new BadRequestException('Inventory not found');
    }

    if (inventory.reserved < quantity) {
      throw new BadRequestException('Invalid reserved stock');
    }

    return tx.inventory.update({
      where: {
        storeId_variantId: {
          storeId,
          variantId,
        },
      },
      data: {
        reserved: {
          decrement: quantity,
        },
      },
    });
  }

  /*
    Wrapper
  */
  async confirmStock(storeId: number, variantId: number, quantity: number) {
    return this.prisma.$transaction((tx) =>
      this.confirmStockTx(tx, storeId, variantId, quantity),
    );
  }

  /*
    Usado dentro de transacción existente
  */
  async confirmStockTx(
    tx: Prisma.TransactionClient,
    storeId: number,
    variantId: number,
    quantity: number,
  ) {
    const inventory = await tx.inventory.findUnique({
      where: {
        storeId_variantId: {
          storeId,
          variantId,
        },
      },
    });

    if (!inventory) {
      throw new BadRequestException('Inventory not found');
    }

    if (inventory.reserved < quantity) {
      throw new BadRequestException('Invalid reserved stock');
    }

    return tx.inventory.update({
      where: {
        storeId_variantId: {
          storeId,
          variantId,
        },
      },
      data: {
        quantity: {
          decrement: quantity,
        },
        reserved: {
          decrement: quantity,
        },
      },
    });
  }
}
