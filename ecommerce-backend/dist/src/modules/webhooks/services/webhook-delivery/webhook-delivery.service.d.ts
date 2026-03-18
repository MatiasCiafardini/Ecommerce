import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
export declare class WebhookDeliveryService extends WorkerHost {
    process(job: Job<any>): Promise<boolean>;
}
