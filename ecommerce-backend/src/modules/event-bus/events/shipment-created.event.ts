export interface ShipmentCreatedPayload {
  shipmentId: string;
  orderId: string;
}

export const SHIPMENT_CREATED_EVENT = 'shipment.created';
