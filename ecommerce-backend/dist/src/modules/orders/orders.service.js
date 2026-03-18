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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const inventory_lock_service_1 = require("../inventory-lock/inventory-lock.service");
let OrdersService = class OrdersService {
    prisma;
    inventoryLockService;
    constructor(prisma, inventoryLockService) {
        this.prisma = prisma;
        this.inventoryLockService = inventoryLockService;
    }
    async create(data, storeId) {
        return this.prisma.$transaction(async (tx) => {
            let subtotal = 0;
            const orderItems = [];
            const variantIds = data.items.map((item) => item.variantId);
            const variants = await tx.productVariant.findMany({
                where: {
                    id: { in: variantIds },
                    product: {
                        storeId,
                    },
                },
                include: {
                    inventories: {
                        where: {
                            storeId,
                        },
                    },
                },
            });
            const variantsMap = new Map(variants.map((v) => [v.id, v]));
            for (const item of data.items) {
                const variant = variantsMap.get(item.variantId);
                if (!variant) {
                    throw new common_1.NotFoundException(`Variant ${item.variantId} not found`);
                }
                const inventory = variant.inventories[0];
                if (!inventory) {
                    throw new common_1.NotFoundException(`Inventory missing for variant ${item.variantId}`);
                }
                const available = inventory.quantity - inventory.reserved;
                if (available < item.quantity) {
                    throw new common_1.BadRequestException(`Not enough stock for variant ${item.variantId}`);
                }
                const price = Number(variant.price);
                subtotal += price * item.quantity;
                orderItems.push({
                    variantId: item.variantId,
                    quantity: item.quantity,
                    price,
                });
                await this.inventoryLockService.reserveStockTx(tx, storeId, item.variantId, item.quantity);
            }
            const total = subtotal;
            const order = await tx.order.create({
                data: {
                    storeId,
                    customerId: data.customerId,
                    subtotal,
                    discountAmount: 0,
                    total,
                    status: 'pending',
                    items: {
                        create: orderItems,
                    },
                },
                include: {
                    items: true,
                },
            });
            return order;
        });
    }
    async updateStatus(orderId, status, storeId) {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findFirst({
                where: {
                    id: orderId,
                    storeId,
                },
                include: { items: true },
            });
            if (!order) {
                throw new common_1.NotFoundException('Order not found');
            }
            const validTransitions = {
                pending: ['cancelled', 'paid'],
                paid: ['processing', 'cancelled'],
                processing: ['packed', 'cancelled'],
                packed: ['shipped'],
                shipped: ['delivered'],
                delivered: [],
                cancelled: [],
                refunded: [],
            };
            const allowed = validTransitions[order.status];
            if (!allowed.includes(status)) {
                throw new common_1.BadRequestException(`Invalid status transition from ${order.status} to ${status}`);
            }
            if (status === 'cancelled') {
                for (const item of order.items) {
                    await this.inventoryLockService.releaseStockTx(tx, storeId, item.variantId, item.quantity);
                }
            }
            return tx.order.update({
                where: { id: orderId },
                data: { status },
            });
        });
    }
    findAll(storeId) {
        return this.prisma.order.findMany({
            where: {
                storeId,
            },
            include: {
                items: true,
                shipment: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    findOne(id, storeId) {
        return this.prisma.order.findFirst({
            where: {
                id,
                storeId,
            },
            include: {
                items: true,
                shipment: {
                    include: {
                        trackingEvents: true,
                    },
                },
            },
        });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        inventory_lock_service_1.InventoryLockService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map