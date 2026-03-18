import { WebhooksService } from '../../services/webhooks/webhooks.service';
import { CreateWebhookDto } from '../../dto/create-webhook.dto';
import { UpdateWebhookDto } from '../../dto/update-webhook.dto';
export declare class WebhooksController {
    private readonly webhooksService;
    constructor(webhooksService: WebhooksService);
    create(req: any, dto: CreateWebhookDto): Promise<{
        id: string;
        createdAt: Date;
        storeId: number;
        url: string;
        updatedAt: Date;
        secret: string;
        events: string[];
        isActive: boolean;
    }>;
    findAll(req: any): Promise<{
        id: string;
        createdAt: Date;
        storeId: number;
        url: string;
        updatedAt: Date;
        secret: string;
        events: string[];
        isActive: boolean;
    }[]>;
    findOne(req: any, id: string): Promise<({
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
    update(req: any, id: string, dto: UpdateWebhookDto): Promise<{
        id: string;
        createdAt: Date;
        storeId: number;
        url: string;
        updatedAt: Date;
        secret: string;
        events: string[];
        isActive: boolean;
    }>;
    remove(req: any, id: string): Promise<{
        id: string;
        createdAt: Date;
        storeId: number;
        url: string;
        updatedAt: Date;
        secret: string;
        events: string[];
        isActive: boolean;
    }>;
    testEvent(req: any): Promise<{
        message: string;
    }>;
}
