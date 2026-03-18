import { PrismaService } from '../../../prisma/prisma.service';
import { CreateShipmentDto } from '../dto/create-shipment.dto';
import { ShipmentStatus } from '@prisma/client';
export declare class ShipmentService {
    private prisma;
    constructor(prisma: PrismaService);
    createShipment(storeId: number, dto: CreateShipmentDto): Promise<{
        id: string;
        createdAt: Date;
        storeId: number;
        weight: number | null;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ShipmentStatus;
        orderId: number;
        provider: string;
        method: string;
        trackingNumber: string | null;
        trackingUrl: string | null;
        shippingAddress: string;
        postalCode: string;
    }>;
    findAll(storeId: number): Promise<({
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
        provider: string;
        method: string;
        trackingNumber: string | null;
        trackingUrl: string | null;
        shippingAddress: string;
        postalCode: string;
    })[]>;
    findOne(storeId: number, shipmentId: string): Promise<{
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
        provider: string;
        method: string;
        trackingNumber: string | null;
        trackingUrl: string | null;
        shippingAddress: string;
        postalCode: string;
    }>;
    updateStatus(shipmentId: string, status: ShipmentStatus): Promise<{
        id: string;
        createdAt: Date;
        storeId: number;
        weight: number | null;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.ShipmentStatus;
        orderId: number;
        provider: string;
        method: string;
        trackingNumber: string | null;
        trackingUrl: string | null;
        shippingAddress: string;
        postalCode: string;
    }>;
}
