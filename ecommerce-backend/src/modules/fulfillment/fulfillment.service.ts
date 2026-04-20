import { Injectable } from '@nestjs/common';
import { ShipmentService } from './services/shipment.service';
import { TrackingService } from './services/tracking.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { TrackingEventDto } from './dto/tracking-event.dto';
import { UpdateManualShipmentDto } from './dto/update-manual-shipment.dto';

@Injectable()
export class FulfillmentService {
  constructor(
    private shipmentService: ShipmentService,
    private trackingService: TrackingService,
  ) {}

  async createShipment(storeId: number | string, dto: CreateShipmentDto) {
    return this.shipmentService.createShipment(Number(storeId), dto);
  }

  async getShipments(storeId: number | string) {
    return this.shipmentService.findAll(Number(storeId));
  }

  async getShipment(storeId: number | string, shipmentId: string) {
    return this.shipmentService.findOne(Number(storeId), shipmentId);
  }

  async addTracking(storeId: number | string, dto: TrackingEventDto) {
    return this.trackingService.addTrackingEvent(Number(storeId), dto);
  }

  async updateManualShipment(
    storeId: number | string,
    shipmentId: string,
    dto: UpdateManualShipmentDto,
  ) {
    return this.shipmentService.updateManualShipment(
      Number(storeId),
      shipmentId,
      dto,
    );
  }

  async getPrintableLabel(storeId: number | string, shipmentId: string) {
    return this.shipmentService.getPrintableLabel(Number(storeId), shipmentId);
  }

  async getLabelPdf(storeId: number | string, shipmentId: string) {
    return this.shipmentService.getLabelPdf(Number(storeId), shipmentId);
  }

  async getReceiptPdf(storeId: number | string, shipmentId: string) {
    return this.shipmentService.getReceiptPdf(Number(storeId), shipmentId);
  }
}
