import { PrismaService } from '../../../prisma/prisma.service';
import { TrackingEventDto } from '../dto/tracking-event.dto';
export declare class TrackingService {
    private prisma;
    constructor(prisma: PrismaService);
    addTrackingEvent(storeId: number, dto: TrackingEventDto): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ShipmentStatus;
        shipmentId: string;
        location: string | null;
    }>;
    getTracking(shipmentId: string): Promise<{
        id: string;
        description: string | null;
        createdAt: Date;
        status: import("@prisma/client").$Enums.ShipmentStatus;
        shipmentId: string;
        location: string | null;
    }[]>;
}
