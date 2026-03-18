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
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let CartService = class CartService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createCart(storeId, customerId) {
        const existingCart = await this.prisma.cart.findFirst({
            where: {
                storeId,
                customerId,
                status: 'active',
            },
        });
        if (existingCart) {
            return existingCart;
        }
        return this.prisma.cart.create({
            data: {
                storeId,
                customerId,
            },
        });
    }
    async getCart(storeId, cartId) {
        const cart = await this.prisma.cart.findFirst({
            where: {
                id: cartId,
                storeId,
                status: 'active',
            },
            include: {
                items: {
                    include: {
                        variant: {
                            include: {
                                product: true,
                                inventories: {
                                    where: {
                                        storeId,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!cart) {
            throw new common_1.NotFoundException('Cart not found');
        }
        return cart;
    }
    async addItem(storeId, cartId, dto) {
        const cart = await this.prisma.cart.findFirst({
            where: {
                id: cartId,
                storeId,
                status: 'active',
            },
        });
        if (!cart) {
            throw new common_1.NotFoundException('Cart not found');
        }
        const variant = await this.prisma.productVariant.findUnique({
            where: { id: dto.variantId },
            include: {
                inventories: {
                    where: {
                        storeId,
                    },
                },
            },
        });
        if (!variant) {
            throw new common_1.NotFoundException('Variant not found');
        }
        const inventory = variant.inventories[0];
        const available = (inventory?.quantity || 0) - (inventory?.reserved || 0);
        if (dto.quantity > available) {
            throw new common_1.BadRequestException('Not enough stock');
        }
        const existingItem = await this.prisma.cartItem.findFirst({
            where: {
                cartId,
                variantId: dto.variantId,
            },
        });
        if (existingItem) {
            const newQuantity = existingItem.quantity + dto.quantity;
            if (newQuantity > available) {
                throw new common_1.BadRequestException('Not enough stock');
            }
            return this.prisma.cartItem.update({
                where: { id: existingItem.id },
                data: {
                    quantity: newQuantity,
                },
            });
        }
        return this.prisma.cartItem.create({
            data: {
                cartId,
                variantId: dto.variantId,
                quantity: dto.quantity,
            },
        });
    }
    async updateItem(storeId, cartId, itemId, dto) {
        const item = await this.prisma.cartItem.findFirst({
            where: {
                id: itemId,
                cartId,
                cart: {
                    storeId,
                },
            },
            include: {
                variant: {
                    include: {
                        inventories: {
                            where: {
                                storeId,
                            },
                        },
                    },
                },
            },
        });
        if (!item) {
            throw new common_1.NotFoundException('Item not found');
        }
        const inventory = item.variant.inventories[0];
        const available = (inventory?.quantity || 0) - (inventory?.reserved || 0);
        if (dto.quantity > available) {
            throw new common_1.BadRequestException('Not enough stock');
        }
        return this.prisma.cartItem.update({
            where: { id: itemId },
            data: {
                quantity: dto.quantity,
            },
        });
    }
    async removeItem(storeId, cartId, itemId) {
        const item = await this.prisma.cartItem.findFirst({
            where: {
                id: itemId,
                cartId,
                cart: {
                    storeId,
                },
            },
        });
        if (!item) {
            throw new common_1.NotFoundException('Item not found');
        }
        return this.prisma.cartItem.delete({
            where: { id: itemId },
        });
    }
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CartService);
//# sourceMappingURL=cart.service.js.map