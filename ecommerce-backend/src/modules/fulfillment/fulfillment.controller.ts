import { Controller, Post, Body, Get, Param, Req } from '@nestjs/common';

import { FulfillmentService } from './fulfillment.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { TrackingEventDto } from './dto/tracking-event.dto';

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
  addTracking(@Param('id') id: string, @Body() dto: TrackingEventDto) {
    dto.shipmentId = id;
    return this.fulfillmentService.addTracking(dto);
  }
}
