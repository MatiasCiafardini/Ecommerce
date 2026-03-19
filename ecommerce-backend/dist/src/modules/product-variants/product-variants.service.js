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
exports.ProductVariantsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ProductVariantsService = class ProductVariantsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data, storeId) {
        const product = await this.prisma.product.findFirst({
            where: {
                id: data.productId,
                storeId: storeId,
            },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found in this store');
        }
        return this.prisma.productVariant.create({
            data: {
                productId: data.productId,
                sku: data.sku,
                price: data.price,
                Size: data.Size,
                Color: data.Color,
                weight: data.weight,
                width: data.width,
                height: data.height,
                length: data.length,
                inventories: data.inventoryQuantity !== undefined
                    ? {
                        create: {
                            storeId,
                            quantity: data.inventoryQuantity,
                        },
                    }
                    : undefined,
            },
            include: {
                inventories: {
                    where: {
                        storeId,
                    },
                },
            },
        });
    }
    async update(variantId, data, storeId) {
        const variant = await this.prisma.productVariant.findFirst({
            where: {
                id: variantId,
                deletedAt: null,
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
        if (!variant) {
            throw new common_1.NotFoundException('Variant not found in this store');
        }
        const payload = {};
        if (data.sku !== undefined)
            payload.sku = data.sku;
        if (data.price !== undefined)
            payload.price = data.price;
        if (data.Size !== undefined)
            payload.Size = data.Size ?? null;
        if (data.Color !== undefined)
            payload.Color = data.Color ?? null;
        if (data.weight !== undefined)
            payload.weight = data.weight ?? null;
        if (data.width !== undefined)
            payload.width = data.width ?? null;
        if (data.height !== undefined)
            payload.height = data.height ?? null;
        if (data.length !== undefined)
            payload.length = data.length ?? null;
        await this.prisma.productVariant.update({
            where: {
                id: variantId,
            },
            data: payload,
        });
        if (data.inventoryQuantity !== undefined) {
            await this.prisma.inventory.upsert({
                where: {
                    storeId_variantId: {
                        storeId,
                        variantId,
                    },
                },
                update: {
                    quantity: data.inventoryQuantity,
                },
                create: {
                    storeId,
                    variantId,
                    quantity: data.inventoryQuantity,
                },
            });
        }
        return this.prisma.productVariant.findFirst({
            where: {
                id: variantId,
                deletedAt: null,
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
    }
    async remove(variantId, storeId) {
        const variant = await this.prisma.productVariant.findFirst({
            where: {
                id: variantId,
                deletedAt: null,
                product: {
                    storeId,
                },
            },
            select: {
                id: true,
            },
        });
        if (!variant) {
            throw new common_1.NotFoundException('Variant not found in this store');
        }
        return this.prisma.productVariant.update({
            where: {
                id: variantId,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }
    findByProduct(productId, storeId) {
        return this.prisma.productVariant.findMany({
            where: {
                productId,
                deletedAt: null,
                product: {
                    storeId: storeId,
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
    }
};
exports.ProductVariantsService = ProductVariantsService;
exports.ProductVariantsService = ProductVariantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductVariantsService);
//# sourceMappingURL=product-variants.service.js.map