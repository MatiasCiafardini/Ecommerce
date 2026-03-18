import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class OutboxService {
  constructor(private prisma: PrismaService) {}

  async addEvent(event: string, storeId: number, payload: any) {
    return this.prisma.outboxEvent.create({
      data: {
        event,
        storeId,
        payload,
      },
    });
  }

  async getPendingEvents(limit = 50) {
    return this.prisma.outboxEvent.findMany({
      where: { processed: false },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
  }

  async markProcessed(id: string) {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
  }
}
