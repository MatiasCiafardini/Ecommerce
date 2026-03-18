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
exports.ReturnsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const inventory_lock_service_1 = require("../inventory-lock/inventory-lock.service");
const mercadopago_provider_1 = require("../payments/providers/mercadopago.provider");
let ReturnsService = class ReturnsService {
    prisma;
    inventoryLockService;
    mercadopago;
    constructor(prisma, inventoryLockService, mercadopago) {
        this.prisma = prisma;
        this.inventoryLockService = inventoryLockService;
        this.mercadopago = mercadopago;
    }
    async createReturn(storeId, dto) {
        const order = await this.prisma.order.findFirst({
            where: {
                id: dto.orderId,
                storeId,
            },
            include: {
                items: true,
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        const orderItemsMap = new Map(order.items.map((i) => [i.id, i]));
        for (const item of dto.items) {
            const orderItem = orderItemsMap.get(item.orderItemId);
            if (!orderItem) {
                throw new common_1.BadRequestException('Invalid order item');
            }
            const available = orderItem.quantity - orderItem.returnedQuantity;
            if (item.quantity > available) {
                throw new common_1.BadRequestException(`Cannot return more than purchased`);
            }
        }
        return this.prisma.return.create({
            data: {
                storeId,
                orderId: dto.orderId,
                reason: dto.reason,
                items: {
                    create: dto.items.map((i) => ({
                        orderItemId: i.orderItemId,
                        quantity: i.quantity,
                    })),
                },
            },
            include: {
                items: true,
            },
        });
    }
    async approveReturn(storeId, returnId, dto) {
        return this.prisma.$transaction(async (tx) => {
            const returnRequest = await tx.return.findFirst({
                where: {
                    id: returnId,
                    storeId,
                },
                include: {
                    items: true,
                    order: true,
                },
            });
            if (!returnRequest) {
                throw new common_1.NotFoundException('Return not found');
            }
            if (!dto.approve) {
                return tx.return.update({
                    where: { id: returnId },
                    data: { status: 'rejected' },
                });
            }
            for (const item of returnRequest.items) {
                const orderItem = await tx.orderItem.findUnique({
                    where: { id: item.orderItemId },
                });
                if (!orderItem)
                    continue;
                await tx.inventory.updateMany({
                    where: {
                        variantId: orderItem.variantId,
                        storeId,
                    },
                    data: {
                        quantity: {
                            increment: item.quantity,
                        },
                    },
                });
                await tx.orderItem.update({
                    where: { id: orderItem.id },
                    data: {
                        returnedQuantity: {
                            increment: item.quantity,
                        },
                    },
                });
            }
            const payment = await tx.payment.findFirst({
                where: {
                    orderId: returnRequest.orderId,
                    status: 'approved',
                },
            });
            let refund;
            if (payment) {
                const refundAmount = dto.refundAmount ?? returnRequest.order.total.toNumber();
                try {
                    if (payment.externalId) {
                        await this.mercadopago.refundPayment(payment.externalId, refundAmount);
                    }
                }
                catch (error) {
                    console.warn('MercadoPago refund skipped (test mode)');
                }
                refund = await tx.refund.create({
                    data: {
                        storeId,
                        orderId: returnRequest.orderId,
                        returnId,
                        paymentId: payment.id,
                        amount: refundAmount,
                    },
                });
            }
            await tx.return.update({
                where: { id: returnId },
                data: {
                    status: 'refunded',
                },
            });
            await tx.order.update({
                where: { id: returnRequest.orderId },
                data: {
                    status: 'refunded',
                },
            });
            return {
                success: true,
                refund,
            };
        });
    }
    async findAll(storeId) {
        return this.prisma.return.findMany({
            where: { storeId },
            include: {
                items: true,
                refund: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
};
exports.ReturnsService = ReturnsService;
exports.ReturnsService = ReturnsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        inventory_lock_service_1.InventoryLockService,
        mercadopago_provider_1.MercadoPagoProvider])
], ReturnsService);
//# sourceMappingURL=returns.service.js.map