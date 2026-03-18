import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
export declare class WebhookDeliveryProcessor extends WorkerHost {
    private prisma;
    constructor(prisma: PrismaService);
    process(job: Job<any>): Promise<void>;
}
