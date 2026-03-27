import { Module } from '@nestjs/common';
import { FulfillmentService } from './fulfillment.service';
import { FulfillmentController } from './fulfillment.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ShipmentService } from './services/shipment.service';
import { TrackingService } from './services/tracking.service';
import { TrackingSyncService } from './services/tracking-sync.service';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  imports: [PrismaModule, ShippingModule],
  controllers: [FulfillmentController],
  providers: [
    FulfillmentService,
    ShipmentService,
    TrackingService,
    TrackingSyncService,
  ],
  exports: [FulfillmentService, ShipmentService],
})
export class FulfillmentModule {}
