import { Module } from '@nestjs/common';
import { FulfillmentService } from './fulfillment.service';
import { FulfillmentController } from './fulfillment.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { ShipmentService } from './services/shipment.service';
import { TrackingService } from './services/tracking.service';
import { TrackingSyncService } from './services/tracking-sync.service';

@Module({
  imports: [PrismaModule],
  controllers: [FulfillmentController],
  providers: [
    FulfillmentService,
    ShipmentService,
    TrackingService,
    TrackingSyncService,
  ],
  exports: [FulfillmentService],
})
export class FulfillmentModule {}
