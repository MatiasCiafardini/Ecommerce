import { CashRegisterService } from './cash-register.service';

describe('CashRegisterService', () => {
  it('excludes cancelled current-account payments from the active cash session', async () => {
    const prisma = {
      payment: { findMany: jest.fn().mockResolvedValue([]) },
      currentAccountMovement: {
        findMany: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
      },
      manualReturn: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new CashRegisterService(prisma as any);

    const summary = await (service as any).buildSummary({
      id: 185,
      storeId: 1,
      storeLocationId: 2,
      mode: 'automatic',
      businessDate: new Date('2026-08-03T03:00:00.000Z'),
      openingAmount: 0,
      openedAt: new Date('2026-08-03T03:00:00.000Z'),
      closedAt: null,
    });

    expect(prisma.currentAccountMovement.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          storeId: 1,
          type: 'PAYMENT',
          cancelledAt: null,
          cancellationMovementId: null,
        }),
      }),
    );
    expect(prisma.currentAccountMovement.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'SALE',
          order: { status: { not: 'cancelled' } },
        }),
      }),
    );
    expect(summary.expectedAmount).toBe(0);
  });

  it('excludes cancelled current-account payments from a cash range summary', async () => {
    const prisma = {
      payment: { findMany: jest.fn().mockResolvedValue([]) },
      currentAccountMovement: {
        findMany: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
      },
      manualReturn: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new CashRegisterService(prisma as any);

    const summary = await (service as any).buildSummaryForRange(
      1,
      2,
      new Date('2026-08-03T03:00:00.000Z'),
      new Date('2026-08-04T03:00:00.000Z'),
    );

    expect(prisma.currentAccountMovement.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          storeId: 1,
          storeLocationId: 2,
          type: 'PAYMENT',
          cancelledAt: null,
          cancellationMovementId: null,
        }),
      }),
    );
    expect(prisma.currentAccountMovement.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'SALE',
          order: { status: { not: 'cancelled' } },
        }),
      }),
    );
    expect(summary.expectedAmount).toBe(0);
    expect(summary.movements).toEqual([]);
  });
});
