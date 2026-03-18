import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from '../../prisma/prisma.module';
import { WebhooksModule } from '../webhooks/webhooks.module'; // 👈 AGREGAR

import { EventBusService } from './services/event-bus/event-bus.service';
import { EventsProcessor } from './processors/events.processor';
import { OutboxProcessor } from './processors/outbox.processor';

@Module({
  imports: [
    PrismaModule,
    WebhooksModule, // 👈 AGREGAR

    BullModule.registerQueue(
      { name: 'events' },
      { name: 'outbox' },
    ),
  ],

  providers: [EventBusService, EventsProcessor, OutboxProcessor],

  exports: [EventBusService],
})
export class EventBusModule {}