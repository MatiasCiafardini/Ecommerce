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
var TrackingSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingSyncService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const schedule_1 = require("@nestjs/schedule");
const tracking_service_1 = require("./tracking.service");
let TrackingSyncService = TrackingSyncService_1 = class TrackingSyncService {
    prisma;
    trackingService;
    logger = new common_1.Logger(TrackingSyncService_1.name);
    constructor(prisma, trackingService) {
        this.prisma = prisma;
        this.trackingService = trackingService;
    }
    async syncTracking() {
        const shipments = await this.prisma.shipment.findMany({
            where: {
                status: {
                    in: ['created', 'picked_up', 'in_transit', 'out_for_delivery'],
                },
            },
        });
        if (!shipments.length) {
            return;
        }
        for (const shipment of shipments) {
            try {
                const simulatedStatus = this.simulateTracking(shipment.status);
                if (!simulatedStatus)
                    continue;
                await this.trackingService.addTrackingEvent(shipment.storeId, {
                    shipmentId: shipment.id,
                    status: simulatedStatus,
                    description: 'Automatic tracking update',
                    location: 'Logistics Center',
                });
                this.logger.log(`Shipment ${shipment.id} updated to ${simulatedStatus}`);
            }
            catch (error) {
                this.logger.error(`Tracking sync failed for ${shipment.id}`);
            }
        }
    }
    simulateTracking(status) {
        const flow = {
            created: 'picked_up',
            picked_up: 'in_transit',
            in_transit: 'out_for_delivery',
            out_for_delivery: 'delivered',
        };
        return flow[status];
    }
};
exports.TrackingSyncService = TrackingSyncService;
__decorate([
    (0, schedule_1.Cron)('*/5 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TrackingSyncService.prototype, "syncTracking", null);
exports.TrackingSyncService = TrackingSyncService = TrackingSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tracking_service_1.TrackingService])
], TrackingSyncService);
//# sourceMappingURL=tracking-sync.service.js.map