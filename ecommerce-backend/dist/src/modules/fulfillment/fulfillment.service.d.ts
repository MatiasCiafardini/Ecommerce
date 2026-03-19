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
        storeId: number;
        createdAt: Date;
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
            description: string | null;
            createdAt: Date;
            status: import("@prisma/client").$Enums.ShipmentStatus;
            shipmentId: string;
            location: string | null;
        }[];
    } & {
        id: string;
        storeId: number;
        createdAt: Date;
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
            description: string | null;
            createdAt: Date;
            status: import("@prisma/client").$Enums.ShipmentStatus;
            shipmentId: string;
            location: string | null;
        }[];
    } & {
        id: string;
        storeId: number;
        createdAt: Date;
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
        description: string | null;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ShipmentStatus;
        shipmentId: string;
        location: string | null;
    }>;
}
