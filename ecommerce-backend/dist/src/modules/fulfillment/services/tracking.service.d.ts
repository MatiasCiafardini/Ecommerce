import { PrismaService } from '../../../prisma/prisma.service';
import { TrackingEventDto } from '../dto/tracking-event.dto';
export declare class TrackingService {
    private prisma;
    constructor(prisma: PrismaService);
    addTrackingEvent(dto: TrackingEventDto): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        status: import("@prisma/client").$Enums.ShipmentStatus;
        shipmentId: string;
        location: string | null;
    }>;
    getTracking(shipmentId: string): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        status: import("@prisma/client").$Enums.ShipmentStatus;
        shipmentId: string;
        location: string | null;
    }[]>;
}
