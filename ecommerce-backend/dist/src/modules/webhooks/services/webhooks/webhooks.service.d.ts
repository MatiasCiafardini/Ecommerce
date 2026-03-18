import { PrismaService } from '../../../../prisma/prisma.service';
import { Queue } from 'bullmq';
import { CreateWebhookDto } from '../../dto/create-webhook.dto';
import { UpdateWebhookDto } from '../../dto/update-webhook.dto';
export declare class WebhooksService {
    private readonly prisma;
    private readonly webhookQueue;
    constructor(prisma: PrismaService, webhookQueue: Queue);
    create(storeId: number, dto: CreateWebhookDto): Promise<{
        id: string;
        createdAt: Date;
        storeId: number;
        url: string;
        updatedAt: Date;
        events: string[];
        isActive: boolean;
        secret: string;
    }>;
    emitTestEvent(storeId: number): Promise<{
        message: string;
    }>;
    findAll(storeId: number): Promise<{
        id: string;
        createdAt: Date;
        storeId: number;
        url: string;
        updatedAt: Date;
        events: string[];
        isActive: boolean;
        secret: string;
    }[]>;
    findOne(storeId: number, id: string): Promise<({
        deliveries: {
            id: string;
            createdAt: Date;
            delivered: boolean;
            webhookId: string;
            event: string;
            payload: import("@prisma/client/runtime/library").JsonValue;
            responseStatus: number | null;
            responseBody: string | null;
            attempt: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        storeId: number;
        url: string;
        updatedAt: Date;
        events: string[];
        isActive: boolean;
        secret: string;
    }) | null>;
    update(storeId: number, id: string, dto: UpdateWebhookDto): Promise<{
        id: string;
        createdAt: Date;
        storeId: number;
        url: string;
        updatedAt: Date;
        events: string[];
        isActive: boolean;
        secret: string;
    }>;
    remove(storeId: number, id: string): Promise<{
        id: string;
        createdAt: Date;
        storeId: number;
        url: string;
        updatedAt: Date;
        events: string[];
        isActive: boolean;
        secret: string;
    }>;
    handleEvent(event: string, storeId: number, payload: any): Promise<void>;
}
