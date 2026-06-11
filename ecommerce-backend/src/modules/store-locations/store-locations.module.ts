import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StoreLocationsController } from './store-locations.controller';
import { StoreLocationsService } from './store-locations.service';

@Module({
  imports: [PrismaModule],
  controllers: [StoreLocationsController],
  providers: [StoreLocationsService],
})
export class StoreLocationsModule {}
