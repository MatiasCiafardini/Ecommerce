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

  it('rejects a receipt that would reduce stock instead of treating it as a restock', async () => {
    const { service, tx } = setup();
    await expect(service.setQuantityTx(tx as never, 2, 20, 7, {
      type: 'STOCK_RECEIPT', origin: 'inventory.restock',
    })).rejects.toThrow('A stock receipt must increase the current quantity');
    expect(tx.inventory.update).not.toHaveBeenCalled();
    expect(tx.inventoryMovement.create).not.toHaveBeenCalled();
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

  it('excludes existing gift cards from every inventory analytics total', async () => {
    const { service } = setup();
    (service as any).prisma.$queryRaw.mockResolvedValue([
      { productId: 1, title: 'GIFT CARD TROJANI', skus: 'GIF-CAR-100', published: true, inventoryPolicy: 'UNCLASSIFIED', lowStockThreshold: 3, onHand: 2999, reserved: 0, available: 2999, retailValue: 449900000, sold30: 0, sold60: 0, sold90: 0, categoryIds: [] },
      { productId: 2, title: 'Remera fisica', skus: 'REM-1', published: true, inventoryPolicy: 'RESTOCK', lowStockThreshold: 3, onHand: 2, reserved: 0, available: 2, retailValue: 60000, sold30: 0, sold60: 0, sold90: 0, categoryIds: [] },
    ]);

    const result = await service.analytics(3, {});
    expect(result.summary.products).toBe(1);
    expect(result.summary.productsWithStock).toBe(1);
    expect(result.summary.retailValue).toBe(60000);
    expect(result.items.map((item) => item.productId)).toEqual([2]);
  });

  it('estimates opening-balance age from product creation instead of deployment time', async () => {
    const { service } = setup();
    (service as any).prisma.$queryRaw.mockResolvedValue([]);

    await service.analytics(3, {});

    const query = (service as any).prisma.$queryRaw.mock.calls[0][0];
    expect(query.strings.join(' ')).toContain(
      `m.type = 'OPENING_BALANCE' THEN LEAST(m."createdAt", p."createdAt")`,
    );
  });

  it('uses the confirmed stock reduction as the exact last sale and only falls back to orders', async () => {
    const { service } = setup();
    (service as any).prisma.$queryRaw.mockResolvedValue([
      {
        productId: 1, title: 'Venta exacta', published: true, inventoryPolicy: 'RESTOCK',
        lowStockThreshold: 3, onHand: 5, reserved: 0, available: 5, retailValue: 500,
        sold30: 1, sold60: 1, sold90: 1, lastMovementSaleAt: '2026-08-18T15:30:00.000Z',
        lastOrderSaleAt: '2026-08-20T10:00:00.000Z', categoryIds: [],
      },
      {
        productId: 2, title: 'Venta historica', published: true, inventoryPolicy: 'RESTOCK',
        lowStockThreshold: 3, onHand: 2, reserved: 0, available: 2, retailValue: 200,
        sold30: 0, sold60: 0, sold90: 0, lastOrderSaleAt: '2025-12-01T10:00:00.000Z', categoryIds: [],
      },
    ]);

    const result = await service.analytics(2, { sortBy: 'title', sortDirection: 'asc' });
    const exact = result.items.find((item) => item.productId === 1)!;
    const fallback = result.items.find((item) => item.productId === 2)!;
    expect(exact.lastSaleAt).toBe('2026-08-18T15:30:00.000Z');
    expect(exact.lastSaleEstimated).toBe(false);
    expect(fallback.lastSaleAt).toBe('2025-12-01T10:00:00.000Z');
    expect(fallback.lastSaleEstimated).toBe(true);
  });

  it('keeps old FIFO layers visible after a recent partial restock', async () => {
    const { service } = setup();
    (service as any).prisma.$queryRaw.mockResolvedValue([
      {
        productId: 3, title: 'Jean con capas', brand: 'Kayra', published: true,
        inventoryPolicy: 'RESTOCK', lowStockThreshold: 3, onHand: 11, reserved: 0,
        available: 11, retailValue: 1100, sold30: 0, sold60: 0, sold90: 0,
        firstKnownStockAt: '2025-12-01T12:00:00.000Z', lastRestockAt: '2026-08-20T12:00:00.000Z',
        oldestStockAt: '2025-12-01T12:00:00.000Z', units0To90: 1, units90To180: 0,
        units181To365: 10, unitsOver365: 0, value0To90: 100, value90To180: 0,
        value181To365: 1000, valueOver365: 0, categoryIds: [],
      },
    ]);

    const result = await service.analytics(2, {});
    expect(result.items[0]).toEqual(expect.objectContaining({
      available: 11,
      lastRestockAt: '2026-08-20T12:00:00.000Z',
      aged180Units: 10,
      aged180Value: 1000,
      immobilizedValue: 1000,
    }));
    expect(result.items[0].ageDays).toBeGreaterThan(180);
    expect(result.summary.oldProducts).toBe(1);
    expect(result.summary.oldStockValue).toBe(1000);
  });

  it('values available stock and the selected age layer without multiplying the whole product', async () => {
    const { service } = setup();
    (service as any).prisma.$queryRaw.mockResolvedValue([
      {
        productId: 4, title: 'Capas valorizadas', published: true, inventoryPolicy: 'RESTOCK',
        lowStockThreshold: 3, onHand: 8, reserved: 2, available: 6, retailValue: 600,
        sold30: 0, sold60: 0, sold90: 0, oldestStockAt: '2025-10-01T12:00:00.000Z',
        units0To90: 2, units90To180: 0, units181To365: 4, unitsOver365: 0,
        value0To90: 200, value90To180: 0, value181To365: 400, valueOver365: 0,
        categoryIds: [],
      },
    ]);

    const result = await service.analytics(2, { quickFilter: 'older-180' });
    expect(result.summary.retailValue).toBe(600);
    expect(result.items[0].immobilizedValue).toBe(400);
    expect(result.agingBuckets.reduce((sum, bucket) => sum + bucket.value, 0)).toBe(600);
  });

  it('excludes products with no available units from the aging table', async () => {
    const { service } = setup();
    (service as any).prisma.$queryRaw.mockResolvedValue([
      { productId: 5, title: 'Agotado', published: true, inventoryPolicy: 'RESTOCK', lowStockThreshold: 3, onHand: 0, reserved: 0, available: 0, retailValue: 0, sold30: 0, sold60: 0, sold90: 0, categoryIds: [] },
      { productId: 6, title: 'Disponible', published: true, inventoryPolicy: 'RESTOCK', lowStockThreshold: 3, onHand: 1, reserved: 0, available: 1, retailValue: 100, sold30: 0, sold60: 0, sold90: 0, categoryIds: [] },
    ]);

    const result = await service.analytics(2, {});
    expect(result.summary.withoutStock).toBe(1);
    expect(result.items.map((item) => item.productId)).toEqual([6]);
  });
});
