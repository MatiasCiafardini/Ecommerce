import { PrismaService } from '../../../../prisma/prisma.service';
import { DomainEvent } from '../../types/domain-event.type';
export declare class EventBusService {
    private prisma;
    constructor(prisma: PrismaService);
    publish<T>(event: DomainEvent<T>): Promise<void>;
}
