import { Controller, Post, Body, Get, Param, Req, UseGuards } from '@nestjs/common';

import { FulfillmentService } from './fulfillment.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { TrackingEventDto } from './dto/tracking-event.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

@UseGuards(AdminAuthGuard)
@Controller('admin/shipments')
export class FulfillmentController {
  constructor(private readonly fulfillmentService: FulfillmentService) {}

  @Post()
  createShipment(@Req() req, @Body() dto: CreateShipmentDto) {
    return this.fulfillmentService.createShipment(req.storeId, dto);
  }

  @Get()
  findAll(@Req() req) {
    return this.fulfillmentService.getShipments(req.storeId);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.fulfillmentService.getShipment(req.storeId, id);
  }

  @Post(':id/tracking')
  addTracking(@Req() req, @Param('id') id: string, @Body() dto: TrackingEventDto) {
    dto.shipmentId = id;
    return this.fulfillmentService.addTracking(req.storeId, dto);
  }
}
