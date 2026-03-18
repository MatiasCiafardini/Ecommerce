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
exports.ShipmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let ShipmentService = class ShipmentService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createShipment(storeId, dto) {
        const order = await this.prisma.order.findFirst({
            where: {
                id: Number(dto.orderId),
                storeId,
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        const shipment = await this.prisma.shipment.create({
            data: {
                storeId,
                orderId: Number(dto.orderId),
                provider: dto.provider,
                method: dto.method,
                weight: dto.weight,
                shippingAddress: dto.shippingAddress,
                postalCode: dto.postalCode,
                status: client_1.ShipmentStatus.created,
            },
        });
        return shipment;
    }
    async findAll(storeId) {
        return this.prisma.shipment.findMany({
            where: { storeId },
            include: {
                trackingEvents: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async findOne(storeId, shipmentId) {
        const shipment = await this.prisma.shipment.findFirst({
            where: {
                id: shipmentId,
                storeId,
            },
            include: {
                trackingEvents: true,
            },
        });
        if (!shipment) {
            throw new common_1.NotFoundException('Shipment not found');
        }
        return shipment;
    }
    async updateStatus(shipmentId, status) {
        return this.prisma.shipment.update({
            where: { id: shipmentId },
            data: { status },
        });
    }
};
exports.ShipmentService = ShipmentService;
exports.ShipmentService = ShipmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ShipmentService);
//# sourceMappingURL=shipment.service.js.map