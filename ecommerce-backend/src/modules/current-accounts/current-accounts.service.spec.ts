import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CurrentAccountsService } from './current-accounts.service';

describe('CurrentAccountsService payments', () => {
  const storeId = 1;
  const customerId = 10;
  const userId = 88;

  function createService(
    accountBalance = 1500,
    role = 'ADMIN',
    store: Record<string, unknown> = { cashRegisterMode: 'automatic' },
  ) {
    const tx = {
      currentAccount: {
        findFirst: jest.fn().mockResolvedValue({
          id: 25,
          balance: accountBalance,
          storeLocationId: null,
          deletedAt: null,
        }),
        update: jest.fn().mockResolvedValue({ id: 25, balance: 1000 }),
      },
      currentAccountMovement: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 91 }),
      },
    };
    const prisma = {
      store: {
        findUnique: jest.fn().mockResolvedValue(store),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ role }),
      },
      cashRegisterSession: {
        findFirst: jest.fn().mockResolvedValue({ id: 500 }),
        create: jest.fn(),
      },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new CurrentAccountsService(prisma as any);

    return { service, prisma, tx };
  }

  it('registers a payment as a negative movement and reduces the account balance', async () => {
    const { service, tx } = createService(1500);

    await expect(
      service.registerPayment(storeId, customerId, userId, {
        amount: 500,
        paymentMethod: 'Efectivo',
        description: 'Entrega parcial',
      }),
    ).resolves.toMatchObject({
      account: { id: 25, balance: 1000 },
      movement: { id: 91 },
    });

    expect(tx.currentAccount.update).toHaveBeenCalledWith({
      where: { id: 25 },
      data: {
        balance: 1000,
        lastMovementAt: expect.any(Date),
      },
    });
    expect(tx.currentAccountMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        storeId,
        accountId: 25,
        customerId,
        cashRegisterId: 500,
        type: 'PAYMENT',
        amount: -500,
        paymentMethod: 'Efectivo',
        description: 'Entrega parcial',
        createdByUserId: userId,
        balanceAfter: 1000,
      }),
    });
  });

  it('rejects payments greater than the current balance', async () => {
    const { service, tx } = createService(300);

    await expect(
      service.registerPayment(storeId, customerId, userId, {
        amount: 500,
        paymentMethod: 'Transferencia',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.currentAccount.update).not.toHaveBeenCalled();
    expect(tx.currentAccountMovement.create).not.toHaveBeenCalled();
  });

  it('applies the cash discount by default for eligible payments', async () => {
    const { service, tx } = createService(100000, 'ADMIN', {
      id: 7,
      name: 'Como Vos y Yo',
      domain: null,
      storefrontConfig: null,
      cashRegisterMode: 'automatic',
      bankTransferDiscountPercentage: 15,
    });
    tx.currentAccount.update.mockResolvedValue({ id: 25, balance: 0 });

    await expect(
      service.registerPayment(7, customerId, userId, {
        amount: 85000,
        paymentMethod: 'Efectivo',
      }),
    ).resolves.toMatchObject({
      account: { id: 25, balance: 0 },
      movement: { id: 91 },
    });

    expect(tx.currentAccount.update).toHaveBeenCalledWith({
      where: { id: 25 },
      data: {
        balance: 0,
        lastMovementAt: expect.any(Date),
      },
    });
    expect(tx.currentAccountMovement.create).toHaveBeenCalledTimes(2);
    expect(tx.currentAccountMovement.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        storeId: 7,
        accountId: 25,
        customerId,
        type: 'PAYMENT',
        amount: -85000,
        paymentMethod: 'Efectivo',
        balanceAfter: 15000,
      }),
    });
    expect(tx.currentAccountMovement.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        storeId: 7,
        accountId: 25,
        customerId,
        type: 'ADJUSTMENT_NEGATIVE',
        amount: -15000,
        paymentMethod: 'Descuento Efectivo',
        balanceAfter: 0,
      }),
    });
  });

  it('applies a regular non-rounded cash discount for Trojani store', async () => {
    const { service, tx } = createService(46900, 'ADMIN', {
      id: 3,
      name: 'Trojani',
      domain: null,
      storefrontConfig: null,
      cashRegisterMode: 'automatic',
      bankTransferDiscountPercentage: 15,
    });
    tx.currentAccount.update.mockResolvedValue({ id: 25, balance: 0 });

    await expect(
      service.registerPayment(3, customerId, userId, {
        amount: 39865,
        paymentMethod: 'Transferencia',
      }),
    ).resolves.toMatchObject({
      account: { id: 25, balance: 0 },
      movement: { id: 91 },
    });

    expect(tx.currentAccountMovement.create).toHaveBeenCalledTimes(2);
    expect(tx.currentAccountMovement.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        storeId: 3,
        accountId: 25,
        customerId,
        type: 'ADJUSTMENT_NEGATIVE',
        amount: -7035,
        paymentMethod: 'Descuento Transferencia',
        balanceAfter: 0,
      }),
    });
  });

  it('skips the cash discount when the payment explicitly disables it', async () => {
    const { service, tx } = createService(1000, 'ADMIN', {
      id: 7,
      name: 'Como Vos y Yo',
      domain: null,
      storefrontConfig: null,
      cashRegisterMode: 'automatic',
      bankTransferDiscountPercentage: 15,
    });
    tx.currentAccount.update.mockResolvedValue({ id: 25, balance: 0 });

    await expect(
      service.registerPayment(7, customerId, userId, {
        amount: 1000,
        paymentMethod: 'Efectivo',
        applyCashDiscount: false,
      }),
    ).resolves.toMatchObject({
      account: { id: 25, balance: 0 },
      movement: { id: 91 },
    });

    expect(tx.currentAccount.update).toHaveBeenCalledWith({
      where: { id: 25 },
      data: {
        balance: 0,
        lastMovementAt: expect.any(Date),
      },
    });
    expect(tx.currentAccountMovement.create).toHaveBeenCalledTimes(1);
    expect(tx.currentAccountMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        storeId: 7,
        accountId: 25,
        customerId,
        type: 'PAYMENT',
        amount: -1000,
        paymentMethod: 'Efectivo',
        balanceAfter: 0,
      }),
    });
  });

  it('updates an existing payment and keeps the receipt movement normalized', async () => {
    const { service, tx } = createService(1000);
    tx.currentAccountMovement.findFirst.mockResolvedValueOnce({
      id: 91,
      storeId,
      storeLocationId: null,
      accountId: 25,
      customerId,
      orderId: null,
      cashRegisterId: 500,
      type: 'PAYMENT',
      amount: -500,
      paymentMethod: 'Efectivo',
      description: 'Pago original',
      account: {
        id: 25,
        balance: 1000,
      },
    }).mockResolvedValueOnce(null);
    tx.currentAccountMovement.update.mockResolvedValue({ id: 91, amount: -300 });
    tx.currentAccount.update.mockResolvedValue({ id: 25, balance: 1200 });

    await expect(
      service.updatePayment(storeId, 91, userId, {
        amount: 300,
        paymentMethod: 'Transferencia',
        description: 'Pago corregido',
        reason: 'Se cargo de mas',
      }),
    ).resolves.toMatchObject({
      movement: { id: 91, amount: -300 },
      account: { id: 25, balance: 1200 },
    });

    expect(tx.currentAccount.update).toHaveBeenCalledWith({
      where: { id: 25 },
      data: {
        balance: 1200,
        lastMovementAt: expect.any(Date),
      },
    });
    expect(tx.currentAccountMovement.update).toHaveBeenCalledWith({
      where: { id: 91 },
      data: {
        amount: -300,
        paymentMethod: 'Transferencia',
        description: 'Pago corregido',
      },
    });
    expect(tx.currentAccountMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: 0,
        paymentMethod: 'Auditoria',
        createdByUserId: userId,
      }),
    });
  });

  it('cancels a payment with a compensating movement', async () => {
    const { service, tx } = createService(1000);
    tx.currentAccountMovement.findFirst.mockResolvedValueOnce({
      id: 91,
      storeId,
      storeLocationId: null,
      accountId: 25,
      customerId,
      orderId: null,
      cashRegisterId: 500,
      type: 'PAYMENT',
      amount: -500,
      paymentMethod: 'Efectivo',
      account: {
        id: 25,
        balance: 1000,
      },
    }).mockResolvedValueOnce(null);
    tx.currentAccount.update.mockResolvedValue({ id: 25, balance: 1500 });
    tx.currentAccountMovement.create.mockResolvedValue({ id: 92 });
    tx.currentAccountMovement.update.mockResolvedValue({
      id: 91,
      cancelledAt: new Date(),
      cancellationMovementId: 92,
      account: {
        id: 25,
        balance: 1500,
      },
    });

    await expect(
      service.cancelPayment(storeId, 91, userId, {
        reason: 'Pago de otro cliente',
      }),
    ).resolves.toMatchObject({
      reversal: { id: 92 },
      account: { id: 25, balance: 1500 },
    });

    expect(tx.currentAccount.update).toHaveBeenCalledWith({
      where: { id: 25 },
      data: {
        balance: 1500,
        lastMovementAt: expect.any(Date),
      },
    });
    expect(tx.currentAccountMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'ADJUSTMENT_POSITIVE',
        amount: 500,
        paymentMethod: 'Anulacion de pago',
        createdByUserId: userId,
        balanceAfter: 1500,
      }),
    });
    expect(tx.currentAccountMovement.update).toHaveBeenCalledWith({
      where: { id: 91 },
      data: expect.objectContaining({
        cancelledAt: expect.any(Date),
        cancelledByUserId: userId,
        cancellationReason: 'Pago de otro cliente',
        cancellationMovementId: 92,
      }),
      include: {
        account: true,
      },
    });
  });

  it('rejects editing a payment that was already cancelled', async () => {
    const { service, tx } = createService(1000);
    tx.currentAccountMovement.findFirst.mockResolvedValueOnce({
      id: 91,
      storeId,
      storeLocationId: null,
      accountId: 25,
      customerId,
      orderId: null,
      cashRegisterId: 500,
      type: 'PAYMENT',
      amount: -500,
      paymentMethod: 'Efectivo',
      account: {
        id: 25,
        balance: 1000,
      },
    }).mockResolvedValueOnce({ id: 91 });

    await expect(
      service.updatePayment(storeId, 91, userId, {
        amount: 300,
        paymentMethod: 'Transferencia',
        reason: 'Correccion tardia',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.currentAccount.update).not.toHaveBeenCalled();
    expect(tx.currentAccountMovement.update).not.toHaveBeenCalled();
  });

  it('rejects cancelling a payment twice', async () => {
    const { service, tx } = createService(1000);
    tx.currentAccountMovement.findFirst.mockResolvedValueOnce({
      id: 91,
      storeId,
      storeLocationId: null,
      accountId: 25,
      customerId,
      orderId: null,
      cashRegisterId: 500,
      type: 'PAYMENT',
      amount: -500,
      paymentMethod: 'Efectivo',
      account: {
        id: 25,
        balance: 1000,
      },
    }).mockResolvedValueOnce({ id: 92 });

    await expect(
      service.cancelPayment(storeId, 91, userId, {
        reason: 'Segundo intento',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.currentAccount.update).not.toHaveBeenCalled();
    expect(tx.currentAccountMovement.create).not.toHaveBeenCalled();
  });

  it('rejects payment corrections from staff users', async () => {
    const { service, tx } = createService(1000, 'STAFF');

    await expect(
      service.updatePayment(storeId, 91, userId, {
        amount: 300,
        paymentMethod: 'Efectivo',
        reason: 'No autorizado',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(tx.currentAccountMovement.findFirst).not.toHaveBeenCalled();
    expect(tx.currentAccount.update).not.toHaveBeenCalled();
  });
});
