import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
export declare class OutboxProcessor extends WorkerHost {
    private readonly prisma;
    private readonly eventsQueue;
    constructor(prisma: PrismaService, eventsQueue: Queue);
    process(job: Job): Promise<void>;
}
