import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';

import { WebhooksService } from './services/webhooks/webhooks.service';
import { WebhookDeliveryService } from './services/webhook-delivery/webhook-delivery.service';

import { WebhooksController } from './controllers/webhooks/webhooks.controller';
import { WebhookDeliveryProcessor } from './workers/webhook-delivery.processor';

@Module({
  imports: [
    PrismaModule,

    BullModule.registerQueue({
      name: 'webhook-delivery',
    }),
  ],

  controllers: [WebhooksController],

  providers: [
    WebhooksService,
    WebhookDeliveryService,
    WebhookDeliveryProcessor, // 👈 ESTO FALTABA
  ],

  exports: [WebhooksService],
})
export class WebhooksModule {}
