import { PrismaService } from '../../../prisma/prisma.service';
import { CreateShipmentDto } from '../dto/create-shipment.dto';
import { ShipmentStatus } from '@prisma/client';
export declare class ShipmentService {
    private prisma;
    constructor(prisma: PrismaService);
    createShipment(storeId: number, dto: CreateShipmentDto): Promise<{
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
    findAll(storeId: number): Promise<({
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
    findOne(storeId: number, shipmentId: string): Promise<{
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
    updateStatus(shipmentId: string, status: ShipmentStatus): Promise<{
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
}
