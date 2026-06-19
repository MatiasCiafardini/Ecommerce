import { BadRequestException } from '@nestjs/common';
import { CheckoutService } from './checkout.service';

describe('CheckoutService payment rules', () => {
  let service: CheckoutService;
  let prisma: any;
  let inventoryLockService: any;
  let discountsService: any;
  let productPricingService: any;
  let shippingQuotesService: any;
  let storeShippingMethodsService: any;

  beforeEach(() => {
    prisma = {
      order: {
        findFirst: jest.fn(),
      },
      customer: {
        findFirst: jest.fn(),
      },
      cart: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    inventoryLockService = {
      reserveStockTx: jest.fn(),
    };
    discountsService = {
      previewDiscount: jest.fn(),
    };
    productPricingService = {
      resolveCartItemDiscounts: jest.fn(),
    };
    shippingQuotesService = {
      findUsableQuoteById: jest.fn(),
      findMatchingQuote: jest.fn(),
    };
    storeShippingMethodsService = {
      findActiveByName: jest.fn(),
    };

    service = new CheckoutService(
      prisma,
      inventoryLockService,
      discountsService,
      productPricingService,
      shippingQuotesService,
      storeShippingMethodsService,
    );
  });

  it('rejects cash payments for non-pickup shipping', () => {
    expect(() =>
      (service as any).validatePaymentMethod({
        paymentMethod: 'cash',
        shippingProvider: 'correo-argentino',
        shippingMethod: 'Correo Argentino - Domicilio',
      }),
    ).toThrow(BadRequestException);
  });

  it('allows cash payments for pickup orders', () => {
    expect(() =>
      (service as any).validatePaymentMethod({
        paymentMethod: 'cash',
        shippingProvider: 'store',
        shippingMethod: 'Retiro en local',
      }),
    ).not.toThrow();
  });

  it('rejects unsupported checkout payment methods', () => {
    expect(() =>
      (service as any).validatePaymentMethod({
        paymentMethod: 'crypto',
        shippingProvider: 'store',
        shippingMethod: 'Retiro en local',
      }),
    ).toThrow('Unsupported payment method');
  });

  it('creates a pending cash payment in the checkout transaction', async () => {
    const tx = {
      order: {
        create: jest.fn().mockResolvedValue({ id: 15 }),
      },
      orderItem: {
        create: jest.fn(),
      },
      orderEvent: {
        create: jest.fn(),
      },
      payment: {
        create: jest.fn().mockResolvedValue({
          id: 22,
          provider: 'cash',
          status: 'pending',
        }),
      },
      customer: {
        update: jest.fn(),
      },
      cartItem: {
        deleteMany: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: (tx: typeof tx) => unknown) =>
      callback(tx),
    );
    prisma.order.findFirst.mockResolvedValue(null);
    prisma.customer.findFirst.mockResolvedValue({
      id: 8,
      email: 'cliente@example.com',
      firstName: 'Cliente',
      lastName: 'Demo',
      phone: null,
    });
    prisma.cart.findUnique.mockResolvedValue({
      id: 9,
      storeId: 3,
      customerId: 8,
      items: [
        {
          variantId: 44,
          quantity: 1,
          variant: {
            price: 60000,
            inventories: [{ quantity: 2, reserved: 0 }],
            product: {
              title: 'Producto',
              categories: [],
              optionValues: [],
            },
          },
        },
      ],
    });
    productPricingService.resolveCartItemDiscounts.mockResolvedValue({
      baseSubtotal: 60000,
      itemScopedDiscountAmount: 0,
      discountedSubtotal: 60000,
      itemBreakdown: [{ variantId: 44, itemScopedDiscountPerUnit: 0 }],
    });
    discountsService.previewDiscount.mockResolvedValue(null);
    shippingQuotesService.findMatchingQuote.mockResolvedValue(null);
    storeShippingMethodsService.findActiveByName.mockResolvedValue(null);

    await service.checkout(
      3,
      9,
      {
        paymentMethod: 'cash',
        shippingProvider: 'store',
        shippingMethod: 'Retiro en local',
        shippingCost: 0,
        shippingAddress: {
          firstName: 'Cliente',
          lastName: 'Demo',
          phone: '1123456789',
          address1: 'Local',
          city: 'CABA',
          zip: '1000',
          country: 'AR',
        },
        idempotencyKey: 'checkout-1',
      } as any,
      8,
    );

    expect(tx.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        storeId: 3,
        orderId: 15,
        provider: 'cash',
        method: 'cash',
        status: 'pending',
        amount: 60000,
        idempotencyKey: 'cash-checkout:checkout-1',
      }),
    });
    expect(tx.customer.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: {
        phone: '1123456789',
      },
    });
  });
});
