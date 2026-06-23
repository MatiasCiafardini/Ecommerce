import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';

describe('OrdersService manual sale edits', () => {
  const storeId = 1;
  const userId = 44;

  function createService(txOverrides: Record<string, any> = {}) {
    const tx = {
      order: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      inventory: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      orderItem: {
        update: jest.fn(),
        delete: jest.fn(),
        create: jest.fn(),
      },
      currentAccount: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      currentAccountMovement: {
        create: jest.fn(),
      },
      orderEvent: {
        create: jest.fn(),
      },
      ...txOverrides,
    };
    const prisma = {
      store: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: storeId,
            manualSalesEnabled: true,
          })
          .mockResolvedValue({
            id: storeId,
            storefrontConfig: {},
            bankTransferDiscountPercentage: 0,
          }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ role: 'ADMIN' }),
      },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const inventoryLockService = {
      releaseStockTx: jest.fn(),
      reserveStockTx: jest.fn(),
      confirmStockTx: jest.fn(),
    };

    const service = new OrdersService(
      prisma as any,
      inventoryLockService as any,
      {} as any,
      {} as any,
      {} as any,
    );

    return { service, prisma, tx, inventoryLockService };
  }

  function manualSaleOrder(overrides: Record<string, any> = {}) {
    return {
      id: 100,
      storeId,
      storeLocationId: 7,
      customerId: 22,
      subtotal: 1000,
      shippingCost: 0,
      discountAmount: 0,
      total: 1000,
      status: OrderStatus.pending,
      payments: [
        {
          id: 501,
          provider: 'manual',
          method: 'Cuenta corriente',
          status: 'pending',
          amount: 1000,
          metadata: {
            origin: 'manual_sale',
            currentAccount: true,
            discountType: 'percentage',
            discountValue: 0,
          },
        },
      ],
      items: [
        {
          id: 801,
          variantId: 301,
          quantity: 1,
          price: 1000,
          variant: {
            product: {
              title: 'Remera',
              images: [],
            },
          },
        },
      ],
      cancellationRequest: null,
      ...overrides,
    };
  }

  it('creates a current account adjustment when editing the total of a current-account sale', async () => {
    const { service, tx } = createService();
    const order = manualSaleOrder();
    const updatedOrder = {
      ...order,
      subtotal: 1200,
      total: 1200,
      items: [{ ...order.items[0], quantity: 2, price: 600 }],
      payments: [{ ...order.payments[0], amount: 1200 }],
    };

    tx.order.findFirst.mockResolvedValue(order);
    tx.inventory.findUnique.mockResolvedValue({ quantity: 10, reserved: 0 });
    tx.order.update.mockResolvedValue(updatedOrder);
    tx.currentAccount.findFirst.mockResolvedValue({
      id: 70,
      balance: 1000,
    });
    tx.currentAccount.update.mockResolvedValue({ id: 70, balance: 1200 });

    await expect(
      service.updateManualSale(
        order.id,
        {
          reason: 'Precio corregido',
          paymentMethod: 'Cuenta corriente',
          discountType: 'percentage',
          discountValue: 0,
          items: [{ orderItemId: 801, quantity: 2, price: 600 }],
        },
        storeId,
        userId,
      ),
    ).resolves.toMatchObject({ id: order.id, total: 1200 });

    expect(tx.inventory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { quantity: { decrement: 1 } },
      }),
    );
    expect(tx.currentAccount.update).toHaveBeenCalledWith({
      where: { id: 70 },
      data: {
        balance: 1200,
        lastMovementAt: expect.any(Date),
      },
    });
    expect(tx.currentAccountMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountId: 70,
        orderId: order.id,
        type: 'ADJUSTMENT_POSITIVE',
        amount: 200,
        paymentMethod: 'Cuenta corriente',
        balanceAfter: 1200,
        createdByUserId: userId,
      }),
    });
  });

  it('rejects editing manual sales that have split payments', async () => {
    const { service, tx } = createService();
    const order = manualSaleOrder({
      payments: [
        {
          id: 501,
          provider: 'manual',
          method: 'Efectivo',
          status: 'approved',
          amount: 500,
          metadata: { origin: 'manual_sale', splitPayment: true },
        },
        {
          id: 502,
          provider: 'manual',
          method: 'Tarjeta',
          status: 'approved',
          amount: 500,
          metadata: { origin: 'manual_sale', splitPayment: true },
        },
      ],
    });

    tx.order.findFirst.mockResolvedValue(order);

    await expect(
      service.updateManualSale(
        order.id,
        {
          reason: 'Correccion operativa',
          paymentMethod: 'Efectivo',
          items: [{ orderItemId: 801, quantity: 1, price: 1000 }],
        },
        storeId,
        userId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.inventory.update).not.toHaveBeenCalled();
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.currentAccountMovement.create).not.toHaveBeenCalled();
  });
});
