import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { TrackingService } from './tracking.service';
import { StoreShippingProviderConfigService } from '../../shipping/services/store-shipping-provider-config.service';
import { ShipmentService } from './shipment.service';

@Injectable()
export class TrackingSyncService {
  private readonly logger = new Logger(TrackingSyncService.name);

  constructor(
    private prisma: PrismaService,
    private trackingService: TrackingService,
    private providerConfigService: StoreShippingProviderConfigService,
    private shipmentService: ShipmentService,
  ) {}

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
        const resolvedProvider =
          await this.providerConfigService.resolveProviderForCapability(
            shipment.storeId,
            'track',
            {
              providerCode: shipment.provider,
              providerConfigId: (shipment as any).providerConfigId,
            },
          );
        const providerMetadata =
          (resolvedProvider.config?.metadata as Record<string, unknown> | null) ??
          null;

        const autoTrackingEnabled =
          resolvedProvider.provider.providerCode === 'mock' ||
          providerMetadata?.autoTrackingEnabled === true ||
          (providerMetadata?.autoTrackingEnabled !== false &&
            resolvedProvider.provider.providerCode !== 'manual');

        if (
          autoTrackingEnabled &&
          (resolvedProvider.provider.getTracking ||
            resolvedProvider.provider.getShipmentDetail)
        ) {
          await this.shipmentService.refreshShipmentFromProvider(
            shipment.storeId,
            shipment.id,
          );
          this.logger.log(`Shipment ${shipment.id} refreshed from provider`);
          continue;
        }

        const simulatedStatus = this.shouldSimulateTracking(
          resolvedProvider.provider.providerCode,
        )
          ? this.simulateTracking(shipment.status)
          : null;

        if (!simulatedStatus) continue;

        await this.trackingService.addTrackingEvent(shipment.storeId, {
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

  private simulateTracking(status: string) {
    const flow = {
      created: 'picked_up',
      picked_up: 'in_transit',
      in_transit: 'out_for_delivery',
      out_for_delivery: 'delivered',
    };

    return flow[status];
  }

  private shouldSimulateTracking(providerCode: string) {
    if (
      process.env.SHIPPING_TRACKING_SIMULATION_ENABLED?.trim() === 'true'
    ) {
      return true;
    }

    return providerCode === 'mock';
  }
}
