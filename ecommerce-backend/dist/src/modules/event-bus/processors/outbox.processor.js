"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("@nestjs/bullmq");
const bullmq_3 = require("bullmq");
const prisma_service_1 = require("../../../prisma/prisma.service");
let OutboxProcessor = class OutboxProcessor extends bullmq_1.WorkerHost {
    prisma;
    eventsQueue;
    constructor(prisma, eventsQueue) {
        super();
        this.prisma = prisma;
        this.eventsQueue = eventsQueue;
    }
    async process(job) {
        console.log('📦 Processing Outbox events...');
        const events = await this.prisma.outboxEvent.findMany({
            where: { processed: false },
            orderBy: { createdAt: 'asc' },
            take: 50,
        });
        for (const event of events) {
            try {
                console.log('📣 Publishing event:', event.event);
                await this.eventsQueue.add(event.event, {
                    event: event.event,
                    payload: event.payload,
                    storeId: event.storeId,
                });
                await this.prisma.outboxEvent.update({
                    where: { id: event.id },
                    data: {
                        processed: true,
                        processedAt: new Date(),
                    },
                });
            }
            catch (err) {
                console.error('❌ Failed to publish event', err);
            }
        }
    }
};
exports.OutboxProcessor = OutboxProcessor;
exports.OutboxProcessor = OutboxProcessor = __decorate([
    (0, bullmq_1.Processor)('outbox'),
    __param(1, (0, bullmq_2.InjectQueue)('events')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        bullmq_3.Queue])
], OutboxProcessor);
//# sourceMappingURL=outbox.processor.js.map