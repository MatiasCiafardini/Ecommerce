import { DiscountsService } from './discounts.service';

describe('DiscountsService', () => {
  let service: DiscountsService;
  let prisma: {
    store: {
      findUnique: jest.Mock;
    };
  };
  let discountEngine: {
    calculateAutomaticDiscount: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      store: {
        findUnique: jest.fn(),
      },
    };
    discountEngine = {
      calculateAutomaticDiscount: jest.fn().mockResolvedValue(null),
    };

    service = new DiscountsService(prisma as never, discountEngine as never);
  });

  it('rounds Comovosyyo bank transfer total before deriving the discount amount', async () => {
    prisma.store.findUnique.mockResolvedValue({
      id: 7,
      name: 'Comovosyyo',
      domain: 'comovosyyo.com',
      storefrontConfig: {
        theme: 'comovosyyo',
      },
      bankTransferDiscountPercentage: 15,
    });

    const result = await service.previewDiscount(7, {
      subtotal: 17600,
      paymentMethod: 'bank_transfer',
    });

    expect(result).toMatchObject({
      paymentMethodDiscountAmount: 2600,
      amount: 2600,
      paymentMethodDiscountPercentage: 15,
    });
  });
});
