import { OrderStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    payment: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let mercadopago: {
    createPayment: jest.Mock;
    getPayment: jest.Mock;
  };
  let inventoryLockService: {
    confirmStockTx: jest.Mock;
    releaseStockTx: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      payment: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mercadopago = {
      createPayment: jest.fn(),
      getPayment: jest.fn(),
    };

    inventoryLockService = {
      confirmStockTx: jest.fn(),
      releaseStockTx: jest.fn(),
    };

    service = new PaymentsService(
      prisma as never,
      mercadopago as never,
      inventoryLockService as never,
    );
  });

  it('rejects a manual payment and releases stock from pending orders', async () => {
    const payment = {
      id: 9,
      orderId: 41,
      storeId: 7,
      notes: 'proof reviewed',
    };
    const updatedPayment = {
      ...payment,
      status: 'rejected',
      notes: 'proof reviewed\nTransfer unreadable',
    };
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 41,
          storeId: 7,
          status: OrderStatus.pending,
          items: [
            { variantId: 101, quantity: 2 },
            { variantId: 102, quantity: 1 },
          ],
        }),
        update: jest.fn().mockResolvedValue({ id: 41, status: OrderStatus.cancelled }),
      },
    };

    prisma.payment.findFirst.mockResolvedValue(payment);
    prisma.payment.update.mockResolvedValue(updatedPayment);
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof tx) => Promise<void>) =>
      callback(tx),
    );

    const result = await service.rejectPayment(7, 9, {
      notes: 'Transfer unreadable',
    });

    expect(result).toBe(updatedPayment);
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: payment.id },
      data: {
        status: 'rejected',
        notes: 'proof reviewed\nTransfer unreadable',
        reviewedAt: expect.any(Date),
      },
    });
    expect(inventoryLockService.releaseStockTx).toHaveBeenCalledTimes(2);
    expect(inventoryLockService.releaseStockTx).toHaveBeenNthCalledWith(
      1,
      tx,
      7,
      101,
      2,
    );
    expect(inventoryLockService.releaseStockTx).toHaveBeenNthCalledWith(
      2,
      tx,
      7,
      102,
      1,
    );
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 41 },
      data: {
        status: OrderStatus.cancelled,
      },
    });
  });

  it('cancels pending orders when a Mercado Pago webhook reports a rejected payment', async () => {
    const payment = {
      id: 12,
      orderId: 77,
      storeId: 5,
      externalId: 'mp-900',
    };
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 77,
          storeId: 5,
          status: OrderStatus.pending,
          items: [{ variantId: 501, quantity: 3 }],
        }),
        update: jest.fn().mockResolvedValue({ id: 77, status: OrderStatus.cancelled }),
      },
    };

    prisma.payment.findFirst.mockResolvedValue(payment);
    prisma.payment.update.mockResolvedValue({
      ...payment,
      status: 'rejected',
    });
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof tx) => Promise<void>) =>
      callback(tx),
    );
    mercadopago.getPayment.mockResolvedValue({
      id: 'mp-900',
      status: 'rejected',
    });

    jest
      .spyOn(service as never, 'verifyMercadoPagoWebhookSignature' as never)
      .mockResolvedValue(undefined);

    const result = await service.handleWebhook({
      type: 'payment',
      data: { id: 'mp-900' },
    });

    expect(result).toEqual({ received: true });
    expect(mercadopago.getPayment).toHaveBeenCalledWith(5, 'mp-900');
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: {
        status: 'rejected',
      },
    });
    expect(inventoryLockService.releaseStockTx).toHaveBeenCalledWith(
      tx,
      5,
      501,
      3,
    );
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 77 },
      data: {
        status: OrderStatus.cancelled,
      },
    });
  });
});
