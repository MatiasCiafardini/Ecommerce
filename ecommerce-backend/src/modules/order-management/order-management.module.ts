import { Module } from '@nestjs/common';
import { OrderManagementService } from './order-management.service';
import { OrderManagementController } from './order-management.controller';

@Module({
  providers: [OrderManagementService],
  controllers: [OrderManagementController]
})
export class OrderManagementModule {}
