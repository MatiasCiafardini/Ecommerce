import { FulfillmentService } from './fulfillment.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { TrackingEventDto } from './dto/tracking-event.dto';
export declare class FulfillmentController {
    private readonly fulfillmentService;
    constructor(fulfillmentService: FulfillmentService);
    createShipment(req: any, dto: CreateShipmentDto): Promise<{
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
    findAll(req: any): Promise<({
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
    findOne(req: any, id: string): Promise<{
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
    addTracking(req: any, id: string, dto: TrackingEventDto): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ShipmentStatus;
        shipmentId: string;
        location: string | null;
    }>;
}
