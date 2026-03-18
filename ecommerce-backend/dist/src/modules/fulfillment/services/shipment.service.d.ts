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
        method: string;
        provider: string;
        shippingAddress: string;
        postalCode: string;
        trackingNumber: string | null;
        trackingUrl: string | null;
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
        method: string;
        provider: string;
        shippingAddress: string;
        postalCode: string;
        trackingNumber: string | null;
        trackingUrl: string | null;
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
        method: string;
        provider: string;
        shippingAddress: string;
        postalCode: string;
        trackingNumber: string | null;
        trackingUrl: string | null;
    }>;
    updateStatus(shipmentId: string, status: ShipmentStatus): Promise<{
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
}
