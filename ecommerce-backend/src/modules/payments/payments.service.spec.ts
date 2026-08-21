import { OrderStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: {
    payment: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    orderEvent: {
      create: jest.Mock;
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
      orderEvent: {
        create: jest.fn(),
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
      orderEvent: {
        create: jest.fn(),
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
      { origin: 'payment.cancelled', referenceType: 'order', referenceId: 41 },
    );
    expect(inventoryLockService.releaseStockTx).toHaveBeenNthCalledWith(
      2,
      tx,
      7,
      102,
      1,
      { origin: 'payment.cancelled', referenceType: 'order', referenceId: 41 },
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
      orderEvent: {
        create: jest.fn(),
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
        metadata: expect.objectContaining({
          gateway: 'mercadopago',
          source: 'webhook',
          webhookTopic: 'payment',
          webhookResourceId: 'mp-900',
        }),
      },
    });
    expect(inventoryLockService.releaseStockTx).toHaveBeenCalledWith(
      tx,
      5,
      501,
      3,
      { origin: 'payment.cancelled', referenceType: 'order', referenceId: 77 },
    );
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 77 },
      data: {
        status: OrderStatus.cancelled,
      },
    });
  });

  it('creates a pending cash payment for pickup orders', async () => {
    const createdPayment = {
      id: 31,
      orderId: 88,
      storeId: 4,
      provider: 'cash',
      method: 'cash',
      status: 'pending',
    };
    const order = {
      id: 88,
      storeId: 4,
      customerId: 22,
      total: 17500,
      shippingProvider: 'store',
      shippingMethod: 'Retiro en local',
      customer: {
        email: 'pickup@example.com',
      },
    };

    (prisma as any).order = {
      findFirst: jest.fn().mockResolvedValue(order),
    };
    prisma.payment.findFirst.mockResolvedValue(null);
    const tx = {
      payment: {
        create: jest.fn().mockResolvedValue(createdPayment),
      },
      orderEvent: {
        create: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof tx) => Promise<void>) =>
      callback(tx),
    );

    const result = await service.createPayment(
      4,
      88,
      {
        provider: 'cash',
        method: 'cash',
        idempotencyKey: 'cash-1',
      },
      { sub: 22, role: 'CUSTOMER' },
    );

    expect(result).toBe(createdPayment);
    expect(tx.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        storeId: 4,
        orderId: 88,
        provider: 'cash',
        method: 'cash',
        status: 'pending',
      }),
    });
  });

  it('rejects cash payments for shipping orders', async () => {
    (prisma as any).order = {
      findFirst: jest.fn().mockResolvedValue({
        id: 90,
        storeId: 4,
        customerId: 22,
        total: 17500,
        shippingProvider: 'correo-argentino',
        shippingMethod: 'Correo Argentino - Domicilio',
        customer: {
          email: 'shipping@example.com',
        },
      }),
    };
    prisma.payment.findFirst.mockResolvedValue(null);

    await expect(
      service.createPayment(
        4,
        90,
        {
          provider: 'cash',
          method: 'cash',
          idempotencyKey: 'cash-2',
        },
        { sub: 22, role: 'CUSTOMER' },
      ),
    ).rejects.toThrow('Cash payments are only available for pickup orders');
  });
});
