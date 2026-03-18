import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { CreateWebhookDto } from '../../dto/create-webhook.dto';
import { UpdateWebhookDto } from '../../dto/update-webhook.dto';

import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,

    @InjectQueue('webhook-delivery')
    private readonly webhookQueue: Queue,
  ) {}

  async create(storeId: number, dto: CreateWebhookDto) {
    const secret = crypto.randomBytes(32).toString('hex');

    return this.prisma.webhook.create({
      data: {
        storeId,
        url: dto.url,
        events: dto.events,
        secret,
      },
    });
  }
  async emitTestEvent(storeId: number) {
    const payload = {
      id: 'test-order-' + Date.now(),
      total: 100,
    };

    await this.handleEvent('order.created', storeId, payload);

    return {
      message: 'Test event emitted',
    };
  }
  async findAll(storeId: number) {
    return this.prisma.webhook.findMany({
      where: { storeId },
    });
  }
  async findOne(storeId: number, id: string) {
    return this.prisma.webhook.findFirst({
      where: {
        id,
        storeId,
      },
      include: {
        deliveries: true,
      },
    });
  }
  async update(storeId: number, id: string, dto: UpdateWebhookDto) {
    return this.prisma.webhook.update({
      where: { id },
      data: dto,
    });
  }

  async remove(storeId: number, id: string) {
    return this.prisma.webhook.delete({
      where: { id },
    });
  }

  async handleEvent(event: string, storeId: number, payload: any) {
    console.log('🔥 HANDLE EVENT:', event, 'store:', storeId);

    const webhooks = await this.prisma.webhook.findMany({
      where: {
        storeId,
        isActive: true,
        events: {
          has: event,
        },
      },
    });

    console.log('📡 WEBHOOKS FOUND:', webhooks.length);

    for (const webhook of webhooks) {
      console.log('➕ ADDING JOB TO QUEUE:', webhook.url);

      await this.webhookQueue.add(
        'deliver-webhook',
        {
          webhookId: webhook.id,
          url: webhook.url,
          secret: webhook.secret,
          event,
          storeId,
          payload,
        },
        {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
    }
  }
}
