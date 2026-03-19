import { PrismaService } from '../../../prisma/prisma.service';
export declare class OutboxService {
    private prisma;
    constructor(prisma: PrismaService);
    addEvent(event: string, storeId: number, payload: any): Promise<{
        id: string;
        storeId: number;
        createdAt: Date;
        event: string;
        payload: import("@prisma/client/runtime/library").JsonValue;
        processed: boolean;
        processedAt: Date | null;
    }>;
    getPendingEvents(limit?: number): Promise<{
        id: string;
        storeId: number;
        createdAt: Date;
        event: string;
        payload: import("@prisma/client/runtime/library").JsonValue;
        processed: boolean;
        processedAt: Date | null;
    }[]>;
    markProcessed(id: string): Promise<{
        id: string;
        storeId: number;
        createdAt: Date;
        event: string;
        payload: import("@prisma/client/runtime/library").JsonValue;
        processed: boolean;
        processedAt: Date | null;
    }>;
}
