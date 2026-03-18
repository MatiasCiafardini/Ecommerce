import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { TrackingService } from './tracking.service';

@Injectable()
export class TrackingSyncService {
  private readonly logger = new Logger(TrackingSyncService.name);

  constructor(
    private prisma: PrismaService,
    private trackingService: TrackingService,
  ) {}

  /**
   * Ejecuta cada 5 minutos
   */
  @Cron('*/5 * * * *')
  async syncTracking() {
    const shipments = await this.prisma.shipment.findMany({
      where: {
        status: {
          in: ['created', 'picked_up', 'in_transit', 'out_for_delivery'],
        },
      },
    });

    if (!shipments.length) {
      return;
    }

    for (const shipment of shipments) {
      try {
        /**
         * Aquí normalmente llamarías al provider
         * (EnvioPack, Shippo, etc.)
         *
         * Por ahora simulamos tracking.
         */

        const simulatedStatus = this.simulateTracking(shipment.status);

        if (!simulatedStatus) continue;

        await this.trackingService.addTrackingEvent({
          shipmentId: shipment.id,
          status: simulatedStatus,
          description: 'Automatic tracking update',
          location: 'Logistics Center',
        });

        this.logger.log(
          `Shipment ${shipment.id} updated to ${simulatedStatus}`,
        );
      } catch (error) {
        this.logger.error(`Tracking sync failed for ${shipment.id}`);
      }
    }
  }

  /**
   * Simulación de estados para testing
   */
  private simulateTracking(status: string) {
    const flow = {
      created: 'picked_up',
      picked_up: 'in_transit',
      in_transit: 'out_for_delivery',
      out_for_delivery: 'delivered',
    };

    return flow[status];
  }
}
