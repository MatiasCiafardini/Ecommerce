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
exports.CheckoutService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const inventory_lock_service_1 = require("../inventory-lock/inventory-lock.service");
const discounts_service_1 = require("../discounts/discounts.service");
const discount_engine_service_1 = require("../discounts/engine/discount-engine.service");
let CheckoutService = class CheckoutService {
    prisma;
    inventoryLockService;
    discountsService;
    discountEngine;
    constructor(prisma, inventoryLockService, discountsService, discountEngine) {
        this.prisma = prisma;
        this.inventoryLockService = inventoryLockService;
        this.discountsService = discountsService;
        this.discountEngine = discountEngine;
    }
    async checkout(storeId, cartId, dto) {
        const { customerId, shippingProvider, shippingMethod, shippingCost, couponCode, idempotencyKey, } = dto;
        if (idempotencyKey) {
            const existingOrder = await this.prisma.order.findFirst({
                where: {
                    storeId,
                    idempotencyKey,
                },
            });
            if (existingOrder) {
                return existingOrder;
            }
        }
        const cart = await this.prisma.cart.findUnique({
            where: {
                id: cartId,
            },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                inventories: {
                                    where: {
                                        storeId,
                                    },
                                },
                                product: true,
                            },
                        },
                    },
                },
            },
        });
        if (!cart || cart.storeId !== storeId) {
            throw new common_1.NotFoundException('Cart not found');
        }
        if (!cart.items.length) {
            throw new common_1.BadRequestException('Cart is empty');
        }
        let subtotal = 0;
        for (const item of cart.items) {
            const inventory = item.variant.inventories[0];
            const available = (inventory?.quantity || 0) - (inventory?.reserved || 0);
            if (item.quantity > available) {
                throw new common_1.BadRequestException(`Not enough stock for ${item.variant.product.title}`);
            }
            subtotal += Number(item.variant.price) * item.quantity;
        }
        let discountAmount = 0;
        let discountId = null;
        let discountCode = null;
        let freeShipping = false;
        let couponDiscount = null;
        if (couponCode) {
            couponDiscount = await this.discountsService.applyCoupon(storeId, couponCode, subtotal);
        }
        const automaticDiscount = await this.discountEngine.calculateAutomaticDiscount({
            storeId,
            subtotal,
        });
        if (couponDiscount && automaticDiscount) {
            if (couponDiscount.amount >= automaticDiscount.discountAmount) {
                discountAmount = couponDiscount.amount;
                discountId = couponDiscount.discountId;
                discountCode = couponDiscount.code;
                freeShipping = couponDiscount.freeShipping;
            }
            else {
                discountAmount = automaticDiscount.discountAmount;
                discountId = automaticDiscount.discountId;
                freeShipping = automaticDiscount.freeShipping;
            }
        }
        else if (couponDiscount) {
            discountAmount = couponDiscount.amount;
            discountId = couponDiscount.discountId;
            discountCode = couponDiscount.code;
            freeShipping = couponDiscount.freeShipping;
        }
        else if (automaticDiscount) {
            discountAmount = automaticDiscount.discountAmount;
            discountId = automaticDiscount.discountId;
            freeShipping = automaticDiscount.freeShipping;
        }
        let finalShippingCost = Number(shippingCost ?? 0);
        if (freeShipping) {
            finalShippingCost = 0;
        }
        const total = subtotal - discountAmount + finalShippingCost;
        return this.prisma.$transaction(async (tx) => {
            for (const item of cart.items) {
                await this.inventoryLockService.reserveStockTx(tx, storeId, item.variantId, item.quantity);
            }
            const order = await tx.order.create({
                data: {
                    storeId,
                    customerId,
                    subtotal,
                    discountAmount,
                    discountCode,
                    discountId,
                    total,
                    status: 'pending',
                    shippingProvider,
                    shippingMethod,
                    shippingCost: finalShippingCost,
                    idempotencyKey: idempotencyKey ?? null,
                },
            });
            for (const item of cart.items) {
                await tx.orderItem.create({
                    data: {
                        orderId: order.id,
                        variantId: item.variantId,
                        quantity: item.quantity,
                        price: Number(item.variant.price),
                    },
                });
            }
            if (couponDiscount?.couponId) {
                await tx.coupon.update({
                    where: {
                        id: couponDiscount.couponId,
                    },
                    data: {
                        usedCount: {
                            increment: 1,
                        },
                    },
                });
            }
            await tx.cartItem.deleteMany({
                where: {
                    cartId,
                },
            });
            return order;
        });
    }
};
exports.CheckoutService = CheckoutService;
exports.CheckoutService = CheckoutService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        inventory_lock_service_1.InventoryLockService,
        discounts_service_1.DiscountsService,
        discount_engine_service_1.DiscountEngineService])
], CheckoutService);
//# sourceMappingURL=checkout.service.js.map