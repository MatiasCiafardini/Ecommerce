"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../../prisma/prisma.service");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const crypto = __importStar(require("crypto"));
let WebhooksService = class WebhooksService {
    prisma;
    webhookQueue;
    constructor(prisma, webhookQueue) {
        this.prisma = prisma;
        this.webhookQueue = webhookQueue;
    }
    async create(storeId, dto) {
        const secret = crypto.randomBytes(32).toString('hex');
        return this.prisma.webhook.create({
            data: {
                storeId,
                url: dto.url,
                events: dto.events,
                secret,
            },
        });
    }
    async emitTestEvent(storeId) {
        const payload = {
            id: 'test-order-' + Date.now(),
            total: 100,
        };
        await this.handleEvent('order.created', storeId, payload);
        return {
            message: 'Test event emitted',
        };
    }
    async findAll(storeId) {
        return this.prisma.webhook.findMany({
            where: { storeId },
        });
    }
    async findOne(storeId, id) {
        return this.prisma.webhook.findFirst({
            where: {
                id,
                storeId,
            },
            include: {
                deliveries: true,
            },
        });
    }
    async update(storeId, id, dto) {
        return this.prisma.webhook.update({
            where: { id },
            data: dto,
        });
    }
    async remove(storeId, id) {
        return this.prisma.webhook.delete({
            where: { id },
        });
    }
    async handleEvent(event, storeId, payload) {
        console.log('🔥 HANDLE EVENT:', event, 'store:', storeId);
        const webhooks = await this.prisma.webhook.findMany({
            where: {
                storeId,
                isActive: true,
                events: {
                    has: event,
                },
            },
        });
        console.log('📡 WEBHOOKS FOUND:', webhooks.length);
        for (const webhook of webhooks) {
            console.log('➕ ADDING JOB TO QUEUE:', webhook.url);
            await this.webhookQueue.add('deliver-webhook', {
                webhookId: webhook.id,
                url: webhook.url,
                secret: webhook.secret,
                event,
                storeId,
                payload,
            }, {
                attempts: 5,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
            });
        }
    }
};
exports.WebhooksService = WebhooksService;
exports.WebhooksService = WebhooksService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, bullmq_1.InjectQueue)('webhook-delivery')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        bullmq_2.Queue])
], WebhooksService);
//# sourceMappingURL=webhooks.service.js.map