import { ShipmentService } from './services/shipment.service';
import { TrackingService } from './services/tracking.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { TrackingEventDto } from './dto/tracking-event.dto';
export declare class FulfillmentService {
    private shipmentService;
    private trackingService;
    constructor(shipmentService: ShipmentService, trackingService: TrackingService);
    createShipment(storeId: number | string, dto: CreateShipmentDto): Promise<{
        id: string;
        createdAt: Date;
        storeId: number;
        weight: number | null;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ShipmentStatus;
        orderId: number;
        method: string;
        provider: string;
        shippingAddress: string;
        postalCode: string;
        trackingNumber: string | null;
        trackingUrl: string | null;
    }>;
    getShipments(storeId: number | string): Promise<({
        trackingEvents: {
            id: string;
            createdAt: Date;
            description: string | null;
            status: import("@prisma/client").$Enums.ShipmentStatus;
            shipmentId: string;
            location: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        storeId: number;
        weight: number | null;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ShipmentStatus;
        orderId: number;
        method: string;
        provider: string;
        shippingAddress: string;
        postalCode: string;
        trackingNumber: string | null;
        trackingUrl: string | null;
    })[]>;
    getShipment(storeId: number | string, shipmentId: string): Promise<{
        trackingEvents: {
            id: string;
            createdAt: Date;
            description: string | null;
            status: import("@prisma/client").$Enums.ShipmentStatus;
            shipmentId: string;
            location: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        storeId: number;
        weight: number | null;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ShipmentStatus;
        orderId: number;
        method: string;
        provider: string;
        shippingAddress: string;
        postalCode: string;
        trackingNumber: string | null;
        trackingUrl: string | null;
    }>;
    addTracking(storeId: number | string, dto: TrackingEventDto): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        status: import("@prisma/client").$Enums.ShipmentStatus;
        shipmentId: string;
        location: string | null;
    }>;
}
