import { PrismaService } from '../../../prisma/prisma.service';
import { TrackingService } from './tracking.service';
export declare class TrackingSyncService {
    private prisma;
    private trackingService;
    private readonly logger;
    constructor(prisma: PrismaService, trackingService: TrackingService);
    syncTracking(): Promise<void>;
    private simulateTracking;
}
