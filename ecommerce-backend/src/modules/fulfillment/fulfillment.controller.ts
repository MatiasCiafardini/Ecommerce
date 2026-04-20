import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
  Patch,
  Header,
} from '@nestjs/common';
import type { Response } from 'express';

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

  @Get(':id/label.pdf')
  async downloadLabelPdf(@Req() req, @Param('id') id: string, @Res() res: Response) {
    const document = await this.fulfillmentService.getLabelPdf(req.storeId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${document.filename}"`);
    return res.send(document.pdf);
  }

  @Get(':id/receipt.pdf')
  async downloadReceiptPdf(
    @Req() req,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const document = await this.fulfillmentService.getReceiptPdf(req.storeId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${document.filename}"`);
    return res.send(document.pdf);
  }
}
