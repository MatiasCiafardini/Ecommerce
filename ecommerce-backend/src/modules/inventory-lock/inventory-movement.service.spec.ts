import { BadRequestException } from '@nestjs/common';
import { InventoryMovementService } from './inventory-movement.service';

describe('InventoryMovementService', () => {
  const snapshot = { id: 10, storeId: 2, variantId: 20, quantity: 8, reserved: 1 };

  function setup() {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([snapshot]),
      inventory: { update: jest.fn().mockResolvedValue({ ...snapshot, quantity: 12 }) },
      inventoryMovement: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
      },
    };
    const prisma = { $queryRaw: jest.fn(), inventoryMovement: { findMany: jest.fn(), count: jest.fn() } };
    return { service: new InventoryMovementService(prisma as never), tx };
  }

  it('stores manual before/after values and actor in the same transaction', async () => {
    const { service, tx } = setup();
    await service.setQuantityTx(tx as never, 2, 20, 12, {
      type: 'MANUAL_ADJUSTMENT', origin: 'inventory.manual', reason: 'Ingreso',
      actor: { sub: 7, name: 'Ana', email: 'ana@test.com' },
    });
    expect(tx.inventoryMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      storeId: 2, variantId: 20, actorUserId: 7, quantityDelta: 4,
      quantityBefore: 8, quantityAfter: 12, reason: 'Ingreso',
    }) });
  });

  it('does not create a movement for a no-op adjustment', async () => {
    const { service, tx } = setup();
    await service.setQuantityTx(tx as never, 2, 20, 8, { type: 'MANUAL_ADJUSTMENT', origin: 'inventory.manual' });
    expect(tx.inventory.update).not.toHaveBeenCalled();
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it('rejects stock below the reserved quantity', async () => {
    const { service, tx } = setup();
    await expect(service.setQuantityTx(tx as never, 2, 20, 0, { type: 'MANUAL_ADJUSTMENT', origin: 'inventory.manual' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not apply an idempotent adjustment twice', async () => {
    const { service, tx } = setup();
    tx.inventoryMovement.findUnique.mockResolvedValue({ id: 99 });
    const result = await service.adjustTx(tx as never, 2, 20, 4, 0, {
      type: 'MANUAL_ADJUSTMENT', origin: 'inventory.manual', idempotencyKey: 'stock-import:42',
    });
    expect(result).toEqual(snapshot);
    expect(tx.inventory.update).not.toHaveBeenCalled();
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
  });

  it('excludes no-restock products from actionable out-of-stock metrics', async () => {
    const { service } = setup();
    (service as any).prisma.$queryRaw.mockResolvedValue([
      { productId: 1, title: 'Reponer', published: true, inventoryPolicy: 'RESTOCK', lowStockThreshold: 3, onHand: 0, reserved: 0, available: 0, retailValue: 0, sold30: 0, sold60: 0, sold90: 0, categoryIds: [] },
      { productId: 2, title: 'Discontinuado', published: true, inventoryPolicy: 'NO_RESTOCK', lowStockThreshold: 3, onHand: 0, reserved: 0, available: 0, retailValue: 0, sold30: 0, sold60: 0, sold90: 0, categoryIds: [] },
    ]);
    const result = await service.analytics(2, {});
    expect(result.summary.withoutStock).toBe(1);
  });
});
