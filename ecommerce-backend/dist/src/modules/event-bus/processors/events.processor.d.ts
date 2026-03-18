import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DomainEvent } from '../types/domain-event.type';
import { WebhooksService } from '../../webhooks/services/webhooks/webhooks.service';
export declare class EventsProcessor extends WorkerHost {
    private readonly webhooksService;
    constructor(webhooksService: WebhooksService);
    process(job: Job<DomainEvent>): Promise<void>;
}
