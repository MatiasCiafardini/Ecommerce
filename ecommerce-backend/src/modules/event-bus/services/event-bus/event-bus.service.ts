import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { DomainEvent } from '../../types/domain-event.type';

@Injectable()
export class EventBusService {
  constructor(private prisma: PrismaService) {}

  async publish<T>(event: DomainEvent<T>) {
    await this.prisma.outboxEvent.create({
      data: {
        event: event.event,
        storeId: event.storeId,
        payload: JSON.parse(JSON.stringify(event.payload)),
      },
    });
  }
}
