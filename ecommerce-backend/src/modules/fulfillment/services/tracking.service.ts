import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TrackingEventDto } from '../dto/tracking-event.dto';

@Injectable()
export class TrackingService {
  constructor(private prisma: PrismaService) {}

  async addTrackingEvent(storeId: number, dto: TrackingEventDto) {
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: dto.shipmentId,
        storeId,
      },
      include: { order: true },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    const event = await this.prisma.shipmentTrackingEvent.create({
      data: {
        shipmentId: dto.shipmentId,
        status: dto.status as any,
        description: dto.description,
        location: dto.location,
      },
    });

    await this.prisma.shipment.update({
      where: { id: dto.shipmentId },
      data: {
        status: dto.status as any,
        ...(dto.status === 'delivered' ? {} : {}),
      },
    });

    /**
     * Si el envío fue entregado
     * actualizar estado de la orden
     */
    if (dto.status === 'delivered') {
      await this.prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: 'delivered' },
      });
    }

    return event;
  }

  async getTracking(shipmentId: string) {
    return this.prisma.shipmentTrackingEvent.findMany({
      where: { shipmentId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
