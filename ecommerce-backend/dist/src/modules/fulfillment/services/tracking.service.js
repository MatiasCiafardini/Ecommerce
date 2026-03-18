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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let TrackingService = class TrackingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async addTrackingEvent(storeId, dto) {
        const shipment = await this.prisma.shipment.findFirst({
            where: {
                id: dto.shipmentId,
                storeId,
            },
            include: { order: true },
        });
        if (!shipment) {
            throw new common_1.NotFoundException('Shipment not found');
        }
        const event = await this.prisma.shipmentTrackingEvent.create({
            data: {
                shipmentId: dto.shipmentId,
                status: dto.status,
                description: dto.description,
                location: dto.location,
            },
        });
        await this.prisma.shipment.update({
            where: { id: dto.shipmentId },
            data: { status: dto.status },
        });
        if (dto.status === 'delivered') {
            await this.prisma.order.update({
                where: { id: shipment.orderId },
                data: { status: 'delivered' },
            });
        }
        return event;
    }
    async getTracking(shipmentId) {
        return this.prisma.shipmentTrackingEvent.findMany({
            where: { shipmentId },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
};
exports.TrackingService = TrackingService;
exports.TrackingService = TrackingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TrackingService);
//# sourceMappingURL=tracking.service.js.map