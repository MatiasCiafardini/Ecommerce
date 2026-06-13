import { BadRequestException } from '@nestjs/common';
import { ReturnsService } from './returns.service';

describe('ReturnsService', () => {
  let service: ReturnsService;
  let prisma: {
    return: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let mercadopago: {
    refundPayment: jest.Mock;
  };
  let adminNotificationMailService: {
    sendAdminNotification: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      return: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mercadopago = {
      refundPayment: jest.fn(),
    };

    adminNotificationMailService = {
      sendAdminNotification: jest.fn(),
    };

    service = new ReturnsService(
      prisma as never,
      mercadopago as never,
      adminNotificationMailService as never,
    );
  });

  it('marks a received return without refunding and restores stock only once', async () => {
    const updatedReturn = { id: 15, status: 'received' };
    const tx = {
      return: {
        findFirst: jest.fn().mockResolvedValue({
          id: 15,
          orderId: 81,
          status: 'approved',
          receivedAt: null,
          resolvedAt: null,
          adminNotes: null,
          items: [{ orderItemId: 501, quantity: 2 }],
          order: {
            id: 81,
            items: [{ id: 501, variantId: 301, quantity: 2, returnedQuantity: 0, price: 12000 }],
            refunds: [],
          },
        }),
        update: jest.fn().mockResolvedValue(updatedReturn),
      },
      orderItem: {
        findUnique: jest.fn().mockResolvedValue({ id: 501, variantId: 301 }),
        update: jest.fn().mockResolvedValue({ id: 501 }),
      },
      inventory: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      refund: {
        create: jest.fn(),
      },
      order: {
        update: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    );

    const result = await service.receiveReturn(3, 15, {
      refundCustomer: false,
      adminNotes: 'Producto revisado',
    });

    expect(result).toEqual({
      success: true,
      return: updatedReturn,
      refund: null,
    });
    expect(tx.inventory.updateMany).toHaveBeenCalledWith({
      where: {
        variantId: 301,
        storeId: 3,
      },
      data: {
        quantity: {
          increment: 2,
        },
      },
    });
    expect(tx.orderItem.update).toHaveBeenCalledWith({
      where: { id: 501 },
      data: {
        returnedQuantity: {
          increment: 2,
        },
      },
    });
    expect(tx.return.update).toHaveBeenCalledWith({
      where: { id: 15 },
      data: {
        status: 'received',
        receivedAt: expect.any(Date),
        resolvedAt: null,
        adminNotes: 'Producto revisado',
      },
      include: {
        items: true,
        refund: true,
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
    expect(tx.refund.create).not.toHaveBeenCalled();
    expect(mercadopago.refundPayment).not.toHaveBeenCalled();
  });

  it('resolves a previously received return without incrementing stock twice', async () => {
    const receivedAt = new Date('2026-03-29T12:00:00.000Z');
    const updatedReturn = { id: 16, status: 'resolved' };
    const tx = {
      return: {
        findFirst: jest.fn().mockResolvedValue({
          id: 16,
          orderId: 82,
          status: 'received',
          receivedAt,
          resolvedAt: null,
          adminNotes: 'Ingreso en deposito',
          items: [{ orderItemId: 601, quantity: 1 }],
          order: {
            id: 82,
            items: [{ id: 601, variantId: 401, quantity: 1, returnedQuantity: 1, price: 9000 }],
            refunds: [],
          },
        }),
        update: jest.fn().mockResolvedValue(updatedReturn),
      },
      orderItem: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      inventory: {
        updateMany: jest.fn(),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      refund: {
        create: jest.fn(),
      },
      order: {
        update: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    );

    const result = await service.receiveReturn(3, 16, {
      refundCustomer: false,
      adminNotes: 'Cierre sin reintegro',
    });

    expect(result).toEqual({
      success: true,
      return: updatedReturn,
      refund: null,
    });
    expect(tx.inventory.updateMany).not.toHaveBeenCalled();
    expect(tx.orderItem.update).not.toHaveBeenCalled();
    expect(tx.return.update).toHaveBeenCalledWith({
      where: { id: 16 },
      data: {
        status: 'resolved',
        receivedAt,
        resolvedAt: expect.any(Date),
        adminNotes: 'Ingreso en deposito\nCierre sin reintegro',
      },
      include: {
        items: true,
        refund: true,
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
  });

  it('refunds the customer and closes the order when all items were returned', async () => {
    const updatedReturn = { id: 18, status: 'refunded' };
    const createdRefund = { id: 301, amount: 24000 };
    const tx = {
      return: {
        findFirst: jest.fn().mockResolvedValue({
          id: 18,
          orderId: 91,
          status: 'approved',
          receivedAt: null,
          resolvedAt: null,
          adminNotes: 'Controlado en deposito',
          items: [{ orderItemId: 701, quantity: 2 }],
          order: {
            id: 91,
            subtotal: 20000,
            discountAmount: 1000,
            shippingCost: 5000,
            items: [{ id: 701, variantId: 801, quantity: 2, returnedQuantity: 0, price: 10000 }],
            refunds: [],
          },
        }),
        update: jest.fn().mockResolvedValue(updatedReturn),
      },
      orderItem: {
        findUnique: jest.fn().mockResolvedValue({ id: 701, variantId: 801 }),
        update: jest.fn().mockResolvedValue({ id: 701 }),
      },
      inventory: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 41,
          amount: 24000,
          externalId: 'mp-payment-41',
          status: 'approved',
        }),
        update: jest.fn().mockResolvedValue({ id: 41, status: 'refunded' }),
      },
      refund: {
        create: jest.fn().mockResolvedValue(createdRefund),
      },
      order: {
        update: jest.fn().mockResolvedValue({ id: 91, status: 'refunded' }),
      },
    };

    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    );

    const result = await service.receiveReturn(3, 18, {
      refundCustomer: true,
      adminNotes: 'Reintegro total confirmado',
    });

    expect(result).toEqual({
      success: true,
      return: updatedReturn,
      refund: createdRefund,
    });
    expect(mercadopago.refundPayment).toHaveBeenCalledWith(3, 'mp-payment-41', 24000);
    expect(tx.refund.create).toHaveBeenCalledWith({
      data: {
        storeId: 3,
        orderId: 91,
        returnId: 18,
        paymentId: 41,
        amount: 24000,
      },
    });
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: {
        id: 41,
      },
      data: {
        status: 'refunded',
      },
    });
    expect(tx.return.update).toHaveBeenCalledWith({
      where: { id: 18 },
      data: {
        status: 'refunded',
        receivedAt: expect.any(Date),
        resolvedAt: expect.any(Date),
        adminNotes: 'Controlado en deposito\nReintegro total confirmado',
      },
      include: {
        items: true,
        refund: true,
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 91 },
      data: {
        status: 'refunded',
      },
    });
  });

  it('prevents customers from registering shipment twice', async () => {
    prisma.return.findFirst.mockResolvedValue({
      id: 25,
      status: 'approved',
      shippedAt: new Date(),
      receivedAt: null,
      resolvedAt: null,
      items: [],
      refund: null,
      order: {
        id: 44,
        status: 'paid',
        createdAt: new Date(),
      },
    });

    await expect(
      service.shipReturn(2, 10, 25, {
        carrier: 'Correo Argentino',
      }),
    ).rejects.toThrow(new BadRequestException('Return shipping was already registered'));

    expect(prisma.return.update).not.toHaveBeenCalled();
  });

  it('stores return shipment proofs outside the public uploads path', async () => {
    prisma.return.findFirst.mockResolvedValue({
      id: 26,
      status: 'approved',
      shippedAt: null,
      receivedAt: null,
      resolvedAt: null,
      customerShipmentProofUrl: null,
      items: [],
      refund: null,
      order: {
        id: 45,
        status: 'paid',
        createdAt: new Date(),
      },
    });
    prisma.return.update.mockResolvedValue({
      id: 26,
      customerShipmentProofUrl: '/private-uploads/return-proof.pdf',
    });

    const result = await service.shipReturn(
      2,
      10,
      26,
      {
        trackingNumber: 'ABC123',
      },
      {
        filename: 'return-proof.pdf',
        originalname: 'return-proof.pdf',
      },
    );

    expect(prisma.return.update).toHaveBeenCalledWith({
      where: { id: 26 },
      data: {
        customerShipmentCarrier: null,
        customerShipmentTracking: 'ABC123',
        customerShipmentProofUrl: '/private-uploads/return-proof.pdf',
        shippedAt: expect.any(Date),
      },
      include: {
        items: true,
        refund: true,
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
    expect(result).toEqual({
      id: 26,
      customerShipmentProofUrl: '/returns/26/proof',
    });
  });

  it('maps stored shipment proofs to the protected return proof endpoint', async () => {
    prisma.return.findMany = jest.fn().mockResolvedValue([
      {
        id: 31,
        customerShipmentProofUrl: '/private-uploads/return-proof.pdf',
        items: [],
        refund: null,
        order: {
          id: 50,
          status: 'paid',
          createdAt: new Date(),
        },
      },
    ]);

    await expect(service.findMine(4, 22)).resolves.toEqual([
      {
        id: 31,
        customerShipmentProofUrl: '/returns/31/proof',
        items: [],
        refund: null,
        order: {
          id: 50,
          status: 'paid',
          createdAt: expect.any(Date),
        },
      },
    ]);
  });

  it('records a manual return credit in the customer current account', async () => {
    (prisma as any).store = {
      findUnique: jest.fn().mockResolvedValue({ cashRegisterMode: 'automatic' }),
    };
    (prisma as any).user = {
      findFirst: jest.fn().mockResolvedValue({
        role: 'STAFF',
        storeLocation: null,
      }),
    };

    const tx = {
      productVariant: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 701,
            price: 100,
            product: { id: 1, storeId: 3 },
            inventories: [{ quantity: 0, reserved: 0 }],
          },
        ]),
      },
      inventory: {
        upsert: jest.fn().mockResolvedValue({}),
        update: jest.fn(),
      },
      customer: {
        findFirst: jest.fn().mockResolvedValue({
          id: 44,
          firstName: 'Ana',
          lastName: 'Lopez',
          email: null,
          phone: null,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      currentAccount: {
        findFirst: jest.fn().mockResolvedValue({
          id: 88,
          balance: 20,
          storeLocationId: null,
        }),
        update: jest
          .fn()
          .mockResolvedValueOnce({ id: 88, balance: 20, storeLocationId: null })
          .mockResolvedValueOnce({ id: 88, balance: -80 }),
        create: jest.fn(),
      },
      currentAccountMovement: {
        create: jest.fn().mockResolvedValue({ id: 99 }),
      },
      manualReturn: {
        create: jest.fn().mockResolvedValue({
          id: 12,
          differenceAmount: -100,
          items: [],
        }),
      },
    };

    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    );

    await service.createManualReturn(3, 9, {
      customerId: 44,
      customerName: 'Ana Lopez',
      returnedItems: [{ variantId: 701, quantity: 1, price: 100 }],
      exchangeItems: [],
    });

    expect(tx.currentAccount.update).toHaveBeenLastCalledWith({
      where: { id: 88 },
      data: {
        balance: -80,
        lastMovementAt: expect.any(Date),
      },
    });
    expect(tx.currentAccountMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountId: 88,
        customerId: 44,
        type: 'CREDIT_NOTE',
        amount: -100,
        paymentMethod: 'Saldo a favor',
        balanceAfter: -80,
      }),
    });
  });

  it('records an immediately paid exchange difference as a cash-visible account payment', async () => {
    (prisma as any).store = {
      findUnique: jest.fn().mockResolvedValue({ cashRegisterMode: 'manual' }),
    };
    (prisma as any).user = {
      findFirst: jest.fn().mockResolvedValue({
        storeLocation: { id: 5, name: 'Local Centro', active: true },
      }),
    };
    (prisma as any).cashRegisterSession = {
      findFirst: jest.fn().mockResolvedValue({ id: 77 }),
    };

    const tx = {
      productVariant: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 801,
            price: 50,
            product: { id: 1, storeId: 3 },
            inventories: [{ quantity: 0, reserved: 0 }],
          },
          {
            id: 802,
            price: 80,
            product: { id: 2, storeId: 3 },
            inventories: [{ quantity: 4, reserved: 0 }],
          },
        ]),
      },
      inventory: {
        upsert: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      customer: {
        findFirst: jest.fn().mockResolvedValue({
          id: 45,
          firstName: 'Luis',
          lastName: 'Perez',
          email: null,
          phone: null,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      currentAccount: {
        findFirst: jest.fn().mockResolvedValue({
          id: 89,
          balance: 10,
          storeLocationId: 5,
        }),
        update: jest
          .fn()
          .mockResolvedValueOnce({ id: 89, balance: 10, storeLocationId: 5 })
          .mockResolvedValue({ id: 89 }),
        create: jest.fn(),
      },
      currentAccountMovement: {
        create: jest.fn().mockResolvedValue({ id: 100 }),
      },
      manualReturn: {
        create: jest.fn().mockResolvedValue({
          id: 13,
          differenceAmount: 30,
          items: [],
        }),
      },
    };

    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    );

    await service.createManualReturn(3, 9, {
      customerId: 45,
      customerName: 'Luis Perez',
      settlementMethod: 'Efectivo',
      returnedItems: [{ variantId: 801, quantity: 1, price: 50 }],
      exchangeItems: [{ variantId: 802, quantity: 1, price: 80 }],
    });

    expect(tx.currentAccountMovement.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        type: 'SALE',
        amount: 30,
        paymentMethod: 'Cuenta corriente',
        balanceAfter: 40,
      }),
    });
    expect(tx.currentAccountMovement.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        cashRegisterId: 77,
        type: 'PAYMENT',
        amount: -30,
        paymentMethod: 'Efectivo',
        balanceAfter: 10,
      }),
    });
  });
});
