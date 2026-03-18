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
        secret: string;
        events: string[];
        isActive: boolean;
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
        secret: string;
        events: string[];
        isActive: boolean;
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
        secret: string;
        events: string[];
        isActive: boolean;
    }) | null>;
    update(storeId: number, id: string, dto: UpdateWebhookDto): Promise<{
        id: string;
        createdAt: Date;
        storeId: number;
        url: string;
        updatedAt: Date;
        secret: string;
        events: string[];
        isActive: boolean;
    }>;
    remove(storeId: number, id: string): Promise<{
        id: string;
        createdAt: Date;
        storeId: number;
        url: string;
        updatedAt: Date;
        secret: string;
        events: string[];
        isActive: boolean;
    }>;
    handleEvent(event: string, storeId: number, payload: any): Promise<void>;
}
