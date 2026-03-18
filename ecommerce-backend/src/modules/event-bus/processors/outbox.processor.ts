import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { PrismaService } from '../../../prisma/prisma.service';

@Processor('outbox')
export class OutboxProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,

    @InjectQueue('events')
    private readonly eventsQueue: Queue,
  ) {
    super();
  }

  async process(job: Job) {
    console.log('📦 Processing Outbox events...');

    const events = await this.prisma.outboxEvent.findMany({
      where: { processed: false },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    for (const event of events) {
      try {
        console.log('📣 Publishing event:', event.event);

        await this.eventsQueue.add(event.event, {
          event: event.event,
          payload: event.payload,
          storeId: event.storeId,
        });

        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            processed: true,
            processedAt: new Date(),
          },
        });
      } catch (err) {
        console.error('❌ Failed to publish event', err);
      }
    }
  }
}
