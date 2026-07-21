import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';

describe('OrdersService manual sale edits', () => {
  const storeId = 1;
  const userId = 44;

  function createService(
    txOverrides: Record<string, any> = {},
    storeOverrides: Record<string, any> = {},
  ) {
    const store = {
      id: storeId,
      name: 'Test Store',
      domain: null,
      storefrontConfig: {},
      bankTransferDiscountPercentage: 0,
      cashRegisterMode: 'automatic',
      manualSalesEnabled: true,
      ...storeOverrides,
    };
    const tx = {
      order: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      productVariant: {
        findMany: jest.fn(),
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
      payment: {
        update: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      currentAccount: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      currentAccountMovement: {
        create: jest.fn(),
      },
      customer: {
        update: jest.fn(),
      },
      orderEvent: {
        create: jest.fn(),
      },
      ...txOverrides,
    };
    const prisma = {
      store: {
        findUnique: jest.fn(({ select }: { select?: Record<string, boolean> }) => {
          if (select?.manualSalesEnabled) {
            return Promise.resolve({ manualSalesEnabled: store.manualSalesEnabled });
          }

          if (select?.cashRegisterMode) {
            return Promise.resolve({ cashRegisterMode: store.cashRegisterMode });
          }

          return Promise.resolve({
            id: store.id,
            name: store.name,
            domain: store.domain,
            storefrontConfig: store.storefrontConfig,
            bankTransferDiscountPercentage: store.bankTransferDiscountPercentage,
          });
        }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ role: 'ADMIN' }),
      },
      customer: {
        findFirst: jest.fn().mockResolvedValue({ id: 22 }),
        upsert: jest.fn().mockResolvedValue({ id: 22 }),
      },
      cashRegisterSession: {
        findFirst: jest.fn().mockResolvedValue({ id: 500 }),
        create: jest.fn().mockResolvedValue({ id: 500 }),
      },
      storeLocation: {
        findFirst: jest.fn(),
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

  it('converts an existing split payment into a single payment', async () => {
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
    tx.inventory.findUnique.mockResolvedValue({ quantity: 10, reserved: 0 });
    tx.order.update.mockResolvedValue({
      ...order,
      status: OrderStatus.paid,
      payments: [{ ...order.payments[0], amount: 1000 }],
    });

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
    ).resolves.toMatchObject({ id: order.id });

    expect(tx.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 501 },
      data: expect.objectContaining({ method: 'Efectivo', amount: 1000 }),
    }));
    expect(tx.payment.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [502] } },
    });
    expect(tx.order.update).toHaveBeenCalled();
    expect(tx.currentAccountMovement.create).not.toHaveBeenCalled();
  });

  it('converts a single payment into a split payment containing debit', async () => {
    const { service, tx } = createService();
    const order = manualSaleOrder({
      status: OrderStatus.paid,
      customerEmailSnapshot: 'cliente@example.com',
      payments: [{
        id: 501,
        provider: 'manual',
        method: 'Efectivo',
        status: 'approved',
        amount: 1000,
        metadata: { origin: 'manual_sale', currentAccount: false },
      }],
    });
    tx.order.findFirst.mockResolvedValue(order);
    tx.inventory.findUnique.mockResolvedValue({ quantity: 10, reserved: 0 });
    tx.order.update.mockResolvedValue({ ...order, payments: [] });

    await service.updateManualSale(
      order.id,
      {
        reason: 'Pago dividido corregido',
        payments: [
          { method: 'Débito', amount: 400 },
          { method: 'Transferencia', amount: 600 },
        ],
        items: [{ orderItemId: 801, quantity: 1, price: 1000 }],
      },
      storeId,
      userId,
    );

    expect(tx.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 501 },
      data: expect.objectContaining({ method: 'Débito', amount: 400 }),
    }));
    expect(tx.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: order.id,
        method: 'Transferencia',
        amount: 600,
        status: 'approved',
      }),
    });
  });

  it('converts an edited cash price to the card/base price before sending it to current account', async () => {
    const { service, tx, inventoryLockService } = createService(
      {},
      {
        id: 7,
        name: 'Como Vos y Yo',
        bankTransferDiscountPercentage: 15,
      },
    );

    tx.productVariant.findMany.mockResolvedValue([
      {
        id: 301,
        price: 1000,
        product: { title: 'Jean recto' },
        inventories: [{ quantity: 5, reserved: 0 }],
      },
    ]);
    tx.order.create.mockImplementation(async ({ data }: any) => ({
      id: 428,
      storeId: 7,
      storeLocationId: null,
      customerId: 22,
      subtotal: data.subtotal,
      shippingCost: data.shippingCost,
      discountAmount: data.discountAmount,
      total: data.total,
      status: data.status,
      payments: data.payments.create,
      items: data.items.create.map((item: any, index: number) => ({
        id: 800 + index,
        ...item,
        variant: { product: { title: 'Jean recto', images: [] } },
      })),
      cancellationRequest: null,
    }));
    tx.currentAccount.findFirst.mockResolvedValue({
      id: 70,
      balance: 0,
      storeLocationId: null,
    });
    tx.currentAccount.update.mockResolvedValue({ id: 70, balance: 1000 });

    await expect(
      service.createManualSale(
        {
          customerId: 22,
          paymentMethod: 'Cuenta corriente',
          paymentStatus: 'approved',
          manualPriceMode: 'cash',
          items: [
            {
              variantId: 301,
              quantity: 1,
              price: 850,
              enteredPrice: 850,
              catalogPrice: 1000,
            },
          ],
        },
        7,
        userId,
      ),
    ).resolves.toMatchObject({ id: 428, total: 1000 });

    expect(tx.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subtotal: 1000,
        total: 1000,
        items: {
          create: [
            {
              variantId: 301,
              quantity: 1,
              price: 1000,
            },
          ],
        },
      }),
      include: expect.any(Object),
    });
    expect(tx.currentAccountMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountId: 70,
        customerId: 22,
        orderId: 428,
        type: 'SALE',
        amount: 1000,
        paymentMethod: 'Cuenta corriente',
        description: expect.stringContaining(
          'Precios manuales cargados como efectivo',
        ),
        balanceAfter: 1000,
      }),
    });
    expect(tx.currentAccountMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: expect.stringContaining('manual efectivo'),
      }),
    });
    expect(tx.currentAccountMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: expect.stringContaining('tarjeta calculada'),
      }),
    });
    expect(inventoryLockService.reserveStockTx).toHaveBeenCalledWith(
      tx,
      7,
      301,
      1,
    );
  });

  it('rounds the calculated card price when converting an edited cash price for rounded stores', async () => {
    const { service, tx } = createService(
      {},
      {
        id: 7,
        name: 'Como Vos y Yo',
        bankTransferDiscountPercentage: 15,
      },
    );

    tx.productVariant.findMany.mockResolvedValue([
      {
        id: 301,
        price: 60000,
        product: { title: 'Jean recto' },
        inventories: [{ quantity: 5, reserved: 0 }],
      },
    ]);
    tx.order.create.mockImplementation(async ({ data }: any) => ({
      id: 431,
      storeId: 7,
      storeLocationId: null,
      customerId: 22,
      subtotal: data.subtotal,
      shippingCost: data.shippingCost,
      discountAmount: data.discountAmount,
      total: data.total,
      status: data.status,
      payments: data.payments.create,
      items: data.items.create.map((item: any, index: number) => ({
        id: 830 + index,
        ...item,
        variant: { product: { title: 'Jean recto', images: [] } },
      })),
      cancellationRequest: null,
    }));
    tx.currentAccount.findFirst.mockResolvedValue({
      id: 70,
      balance: 0,
      storeLocationId: null,
    });
    tx.currentAccount.update.mockResolvedValue({ id: 70, balance: 58800 });

    await expect(
      service.createManualSale(
        {
          customerId: 22,
          paymentMethod: 'Cuenta corriente',
          paymentStatus: 'approved',
          manualPriceMode: 'cash',
          items: [
            {
              variantId: 301,
              quantity: 1,
              price: 50000,
              enteredPrice: 50000,
              catalogPrice: 60000,
            },
          ],
        },
        7,
        userId,
      ),
    ).resolves.toMatchObject({ id: 431, total: 58800 });

    expect(tx.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subtotal: 58800,
        total: 58800,
        items: {
          create: [
            {
              variantId: 301,
              quantity: 1,
              price: 58800,
            },
          ],
        },
      }),
      include: expect.any(Object),
    });
    expect(tx.currentAccountMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: 58800,
        balanceAfter: 58800,
        description: expect.stringContaining('tarjeta calculada'),
      }),
    });
  });

  it('keeps an edited card price as the base price and records the cash equivalent', async () => {
    const { service, tx } = createService(
      {},
      {
        id: 7,
        name: 'Como Vos y Yo',
        bankTransferDiscountPercentage: 15,
      },
    );

    tx.productVariant.findMany.mockResolvedValue([
      {
        id: 301,
        price: 1000,
        product: { title: 'Remera basica' },
        inventories: [{ quantity: 5, reserved: 0 }],
      },
    ]);
    tx.order.create.mockImplementation(async ({ data }: any) => ({
      id: 429,
      storeId: 7,
      storeLocationId: null,
      customerId: 22,
      subtotal: data.subtotal,
      shippingCost: data.shippingCost,
      discountAmount: data.discountAmount,
      total: data.total,
      status: data.status,
      payments: data.payments.create,
      items: data.items.create.map((item: any, index: number) => ({
        id: 810 + index,
        ...item,
        variant: { product: { title: 'Remera basica', images: [] } },
      })),
      cancellationRequest: null,
    }));
    tx.currentAccount.findFirst.mockResolvedValue({
      id: 70,
      balance: 0,
      storeLocationId: null,
    });
    tx.currentAccount.update.mockResolvedValue({ id: 70, balance: 1200 });

    await expect(
      service.createManualSale(
        {
          customerId: 22,
          paymentMethod: 'Cuenta corriente',
          paymentStatus: 'approved',
          manualPriceMode: 'card',
          items: [
            {
              variantId: 301,
              quantity: 1,
              price: 1200,
              enteredPrice: 1200,
              catalogPrice: 1000,
            },
          ],
        },
        7,
        userId,
      ),
    ).resolves.toMatchObject({ id: 429, total: 1200 });

    expect(tx.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subtotal: 1200,
        total: 1200,
        items: {
          create: [
            {
              variantId: 301,
              quantity: 1,
              price: 1200,
            },
          ],
        },
      }),
      include: expect.any(Object),
    });
    expect(tx.currentAccountMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: 1200,
        description: expect.stringContaining(
          'Precios manuales cargados como tarjeta',
        ),
      }),
    });
    expect(tx.currentAccountMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: expect.stringContaining('efectivo equivalente'),
      }),
    });
  });

  it('rejects edited manual prices when the user did not choose cash or card mode', async () => {
    const { service, tx, inventoryLockService } = createService(
      {},
      {
        id: 7,
        name: 'Como Vos y Yo',
        bankTransferDiscountPercentage: 15,
      },
    );

    tx.productVariant.findMany.mockResolvedValue([
      {
        id: 301,
        price: 1000,
        product: { title: 'Jean recto' },
        inventories: [{ quantity: 5, reserved: 0 }],
      },
    ]);

    await expect(
      service.createManualSale(
        {
          customerId: 22,
          paymentMethod: 'Cuenta corriente',
          paymentStatus: 'approved',
          items: [
            {
              variantId: 301,
              quantity: 1,
              price: 850,
              enteredPrice: 850,
              catalogPrice: 1000,
            },
          ],
        },
        7,
        userId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.order.create).not.toHaveBeenCalled();
    expect(tx.currentAccountMovement.create).not.toHaveBeenCalled();
    expect(inventoryLockService.reserveStockTx).not.toHaveBeenCalled();
  });

  it('allows edited manual prices without cash/card confirmation when the sale is not current account', async () => {
    const { service, tx } = createService(
      {},
      {
        id: 7,
        name: 'Como Vos y Yo',
        bankTransferDiscountPercentage: 15,
      },
    );

    tx.productVariant.findMany.mockResolvedValue([
      {
        id: 301,
        price: 1000,
        product: { title: 'Jean recto' },
        inventories: [{ quantity: 5, reserved: 0 }],
      },
    ]);
    tx.order.create.mockImplementation(async ({ data }: any) => ({
      id: 430,
      storeId: 7,
      storeLocationId: null,
      customerId: 22,
      subtotal: data.subtotal,
      shippingCost: data.shippingCost,
      discountAmount: data.discountAmount,
      total: data.total,
      status: data.status,
      payments: data.payments.create,
      items: data.items.create.map((item: any, index: number) => ({
        id: 820 + index,
        ...item,
        variant: { product: { title: 'Jean recto', images: [] } },
      })),
      cancellationRequest: null,
    }));

    await expect(
      service.createManualSale(
        {
          customerId: 22,
          paymentMethod: 'Efectivo',
          paymentStatus: 'approved',
          items: [
            {
              variantId: 301,
              quantity: 1,
              price: 850,
              enteredPrice: 850,
              catalogPrice: 1000,
            },
          ],
        },
        7,
        userId,
      ),
    ).resolves.toMatchObject({ id: 430, total: 850 });

    expect(tx.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subtotal: 850,
        total: 850,
        items: {
          create: [
            {
              variantId: 301,
              quantity: 1,
              price: 850,
            },
          ],
        },
      }),
      include: expect.any(Object),
    });
    expect(tx.currentAccountMovement.create).not.toHaveBeenCalled();
  });
});
