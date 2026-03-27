import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  UseGuards,
  Patch,
  Header,
} from '@nestjs/common';

import { FulfillmentService } from './fulfillment.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { TrackingEventDto } from './dto/tracking-event.dto';
import { UpdateManualShipmentDto } from './dto/update-manual-shipment.dto';
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

  @Patch(':id/manual')
  updateManualShipment(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateManualShipmentDto,
  ) {
    return this.fulfillmentService.updateManualShipment(req.storeId, id, dto);
  }

  @Get(':id/label')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async getPrintableLabel(@Req() req, @Param('id') id: string) {
    return this.fulfillmentService.getPrintableLabel(req.storeId, id);
  }
}
