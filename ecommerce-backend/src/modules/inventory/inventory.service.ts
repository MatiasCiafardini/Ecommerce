import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import {
  CatalogAuditService,
  type CatalogAuditActor,
} from '../catalog-audit/catalog-audit.service';
import { InventoryMovementService } from '../inventory-lock/inventory-movement.service';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private catalogAudit: CatalogAuditService,
    private movements: InventoryMovementService,
  ) {}

  create(dto: CreateInventoryDto, storeId: number, actor?: CatalogAuditActor) {
    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.create({
        data: {
          storeId,
          variantId: dto.variantId,
          quantity: dto.quantity,
        },
        include: {
          variant: {
            select: {
              id: true,
              productId: true,
              sku: true,
            },
          },
        },
      });

      await this.movements.recordCreatedTx(tx, inventory, {
        type: 'INITIAL_LOAD',
        origin: 'inventory.create',
        actor,
        referenceType: 'inventory',
        referenceId: inventory.id,
      });

      await this.catalogAudit.create({
        storeId,
        productId: inventory.variant.productId,
        variantId: inventory.variantId,
        action: 'inventory.created',
        entity: 'inventory',
        entityId: inventory.id,
        actor,
        after: inventory,
      }, tx);

      return inventory;
    });
  }

  async findByVariant(variantId: number, storeId: number) {
    const inventory = await this.prisma.inventory.findUnique({
      where: {
        storeId_variantId: {
          storeId,
          variantId,
        },
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    return inventory;
  }

  async updateStock(
    variantId: number,
    quantity: number,
    storeId: number,
    actor?: CatalogAuditActor,
    reason?: string,
  ) {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new BadRequestException('Quantity must be a non-negative integer');
    }
    const inventory = await this.prisma.inventory.findUnique({
      where: {
        storeId_variantId: {
          storeId,
          variantId,
        },
      },
      include: {
        variant: {
          select: {
            id: true,
            productId: true,
            sku: true,
          },
        },
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.movements.setQuantityTx(tx, storeId, variantId, quantity, {
        type: 'MANUAL_ADJUSTMENT',
        origin: 'inventory.manual',
        actor,
        reason,
        referenceType: 'inventory',
        referenceId: inventory.id,
      });
      const updated = await tx.inventory.findUniqueOrThrow({
        where: { storeId_variantId: { storeId, variantId } },
        include: { variant: { select: { id: true, productId: true, sku: true } } },
      });

      await this.catalogAudit.create({
        storeId,
        productId: inventory.variant.productId,
        variantId,
        action: 'inventory.updated',
        entity: 'inventory',
        entityId: inventory.id,
        actor,
        before: inventory,
        after: updated,
        metadata: {
          fromQuantity: inventory.quantity,
          toQuantity: quantity,
        },
      }, tx);

      return updated;
    });
  }

  listMovements(storeId: number, query: Record<string, string | undefined>) {
    return this.movements.list(storeId, query);
  }

  getAnalytics(storeId: number, query: Record<string, string | undefined>) {
    return this.movements.analytics(storeId, query);
  }

  getAnalyticsCsv(storeId: number, query: Record<string, string | undefined>) {
    return this.movements.analyticsCsv(storeId, query);
  }
}
