import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateShipmentDto } from '../dto/create-shipment.dto';
import { ShipmentStatus } from '@prisma/client';

@Injectable()
export class ShipmentService {
  constructor(private prisma: PrismaService) {}

  async createShipment(storeId: number, dto: CreateShipmentDto) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: Number(dto.orderId),
        storeId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const shipment = await this.prisma.shipment.create({
      data: {
        storeId,
        orderId: Number(dto.orderId),
        provider: dto.provider,
        method: dto.method,
        weight: dto.weight,
        shippingAddress: dto.shippingAddress,
        postalCode: dto.postalCode,
        status: ShipmentStatus.created,
      },
    });

    return shipment;
  }

  async findAll(storeId: number) {
    return this.prisma.shipment.findMany({
      where: { storeId },
      include: {
        trackingEvents: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(storeId: number, shipmentId: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: {
        id: shipmentId,
        storeId,
      },
      include: {
        trackingEvents: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return shipment;
  }

  async updateStatus(shipmentId: string, status: ShipmentStatus) {
    return this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { status },
    });
  }
}