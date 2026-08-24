import { BadRequestException } from '@nestjs/common';
import { GiftCardsService } from './gift-cards.service';

describe('GiftCardsService', () => {
  const prisma = {
    giftCard: {
      findFirst: jest.fn(),
    },
  };
  const service = new GiftCardsService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('returns an active gift card with remaining balance', async () => {
    prisma.giftCard.findFirst.mockResolvedValue({
      id: 1,
      storeId: 3,
      code: 'GC-AAAA-BBBB-1234',
      codeLastFour: '1234',
      recipientName: 'Maria',
      balance: 20000,
      status: 'ACTIVE',
      expiresAt: null,
      movements: [],
    });

    await expect(service.lookup(3, 'gc-aaaa-bbbb-1234')).resolves.toMatchObject({
      id: 1,
      balance: 20000,
    });
    expect(prisma.giftCard.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeId: 3, code: 'GC-AAAA-BBBB-1234' } }),
    );
  });

  it('rejects an expired gift card', async () => {
    prisma.giftCard.findFirst.mockResolvedValue({
      id: 1,
      codeLastFour: '1234',
      balance: 20000,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() - 1000),
      movements: [],
    });

    await expect(service.lookup(3, 'GC-AAAA-BBBB-1234')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a gift card without remaining balance', async () => {
    prisma.giftCard.findFirst.mockResolvedValue({
      id: 1,
      codeLastFour: '1234',
      balance: 0,
      status: 'REDEEMED',
      expiresAt: null,
      movements: [],
    });

    await expect(service.lookup(3, 'GC-AAAA-BBBB-1234')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
