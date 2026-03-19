import { WebhooksService } from '../../services/webhooks/webhooks.service';
import { CreateWebhookDto } from '../../dto/create-webhook.dto';
import { UpdateWebhookDto } from '../../dto/update-webhook.dto';
export declare class WebhooksController {
    private readonly webhooksService;
    constructor(webhooksService: WebhooksService);
    create(req: any, dto: CreateWebhookDto): Promise<{
        id: string;
        storeId: number;
        createdAt: Date;
        url: string;
        updatedAt: Date;
        events: string[];
        isActive: boolean;
        secret: string;
    }>;
    findAll(req: any): Promise<{
        id: string;
        storeId: number;
        createdAt: Date;
        url: string;
        updatedAt: Date;
        events: string[];
        isActive: boolean;
        secret: string;
    }[]>;
    findOne(req: any, id: string): Promise<({
        deliveries: {
            id: string;
            createdAt: Date;
            delivered: boolean;
            event: string;
            payload: import("@prisma/client/runtime/library").JsonValue;
            webhookId: string;
            responseStatus: number | null;
            responseBody: string | null;
            attempt: number;
        }[];
    } & {
        id: string;
        storeId: number;
        createdAt: Date;
        url: string;
        updatedAt: Date;
        events: string[];
        isActive: boolean;
        secret: string;
    }) | null>;
    update(req: any, id: string, dto: UpdateWebhookDto): Promise<{
        id: string;
        storeId: number;
        createdAt: Date;
        url: string;
        updatedAt: Date;
        events: string[];
        isActive: boolean;
        secret: string;
    }>;
    remove(req: any, id: string): Promise<{
        id: string;
        storeId: number;
        createdAt: Date;
        url: string;
        updatedAt: Date;
        events: string[];
        isActive: boolean;
        secret: string;
    }>;
    testEvent(req: any): Promise<{
        message: string;
    }>;
}
