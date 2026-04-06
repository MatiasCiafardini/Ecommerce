import { NotFoundException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: {
    webhook: {
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      webhook: {
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    service = new WebhooksService(prisma as never, { add: jest.fn() } as never);
  });

  it('blocks updates when the webhook does not belong to the tenant', async () => {
    prisma.webhook.findFirst.mockResolvedValue(null);

    await expect(
      service.update(3, 'wh_123', { url: 'https://attacker.example/webhook' }),
    ).rejects.toThrow(new NotFoundException('Webhook not found'));

    expect(prisma.webhook.update).not.toHaveBeenCalled();
  });

  it('blocks deletions when the webhook does not belong to the tenant', async () => {
    prisma.webhook.findFirst.mockResolvedValue(null);

    await expect(service.remove(3, 'wh_123')).rejects.toThrow(
      new NotFoundException('Webhook not found'),
    );

    expect(prisma.webhook.delete).not.toHaveBeenCalled();
  });
});
