import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Cron } from '@nestjs/schedule';
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

  @Cron('*/10 * * * * *')
  async flushAnalytics() {
    try {
      const pending=await this.prisma.outboxEvent.findMany({where:{processed:false,event:'analytics.conversion'},take:100,orderBy:{createdAt:'asc'}});
      for(const item of pending) {
        await this.eventsQueue.add(item.event,{event:item.event,payload:item.payload,storeId:item.storeId},{jobId:`analytics-${item.id}`,attempts:5,backoff:{type:'exponential',delay:1000},removeOnComplete:1000,removeOnFail:1000});
        await this.prisma.outboxEvent.update({where:{id:item.id},data:{processed:true,processedAt:new Date()}});
      }
    } catch { /* Leave events available for the next retry. */ }
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
