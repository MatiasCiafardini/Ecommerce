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
exports.StorefrontService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const orders_service_1 = require("../orders/orders.service");
let StorefrontService = class StorefrontService {
    prisma;
    ordersService;
    constructor(prisma, ordersService) {
        this.prisma = prisma;
        this.ordersService = ordersService;
    }
    async getStoreConfig(domain) {
        const normalizedDomain = domain?.split(':')[0]?.toLowerCase();
        const store = await this.prisma.store.findUnique({
            where: { domain: normalizedDomain },
        });
        if (!store) {
            throw new Error('Store not found');
        }
        return {
            storeId: store.id,
            theme: 'minimal',
        };
    }
    async getProducts(storeId, query) {
        const where = await this.buildProductsWhere(storeId, query);
        return this.prisma.product.findMany({
            where,
            include: this.productInclude(storeId),
        });
    }
    getStoreProductOptions(storeId) {
        return this.prisma.productOption.findMany({
            where: {
                storeId,
            },
            include: {
                values: {
                    select: {
                        id: true,
                        productId: true,
                        value: true,
                    },
                    orderBy: {
                        value: 'asc',
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
    }
    getProduct(slug, storeId) {
        return this.prisma.product.findFirst({
            where: {
                slug,
                storeId,
                published: true,
            },
            include: {
                images: true,
                variants: {
                    include: {
                        inventories: {
                            where: {
                                storeId,
                            },
                        },
                    },
                },
                categories: {
                    include: {
                        category: true,
                    },
                },
            },
        });
    }
    async getProductOptions(slug, storeId) {
        const product = await this.prisma.product.findFirst({
            where: {
                slug,
                storeId,
                published: true,
            },
            select: {
                id: true,
            },
        });
        if (!product) {
            return null;
        }
        return this.prisma.productOption.findMany({
            where: {
                storeId,
                values: {
                    some: {
                        productId: product.id,
                    },
                },
            },
            include: {
                values: {
                    where: {
                        productId: product.id,
                    },
                    select: {
                        id: true,
                        value: true,
                        productId: true,
                    },
                    orderBy: {
                        value: 'asc',
                    },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
    }
    getCategories(storeId) {
        return this.prisma.category.findMany({
            where: { storeId },
        });
    }
    async getProductsByCategory(slug, storeId, query) {
        const where = await this.buildProductsWhere(storeId, query, slug);
        return this.prisma.product.findMany({
            where,
            include: this.productInclude(storeId),
        });
    }
    createOrder(dto, storeId) {
        return this.ordersService.create(dto, storeId);
    }
    productInclude(storeId) {
        return {
            images: true,
            variants: {
                include: {
                    inventories: {
                        where: {
                            storeId,
                        },
                    },
                },
            },
            categories: {
                include: {
                    category: true,
                },
            },
        };
    }
    async buildProductsWhere(storeId, query, categorySlug) {
        const where = {
            storeId,
            published: true,
        };
        if (categorySlug) {
            where.categories = {
                some: {
                    category: {
                        slug: categorySlug,
                        storeId,
                    },
                },
            };
        }
        const optionValueIds = this.parseOptionValueIds(query?.optionValueIds);
        if (optionValueIds.length === 0) {
            return where;
        }
        const optionValues = await this.prisma.productOptionValue.findMany({
            where: {
                id: { in: optionValueIds },
                productOption: {
                    storeId,
                },
            },
            select: {
                id: true,
                productOptionId: true,
            },
        });
        if (optionValues.length !== optionValueIds.length) {
            throw new common_1.BadRequestException('Invalid option value filters');
        }
        const optionGroups = new Map();
        for (const value of optionValues) {
            const current = optionGroups.get(value.productOptionId) ?? [];
            current.push(value.id);
            optionGroups.set(value.productOptionId, current);
        }
        const existingAnd = Array.isArray(where.AND)
            ? where.AND
            : where.AND
                ? [where.AND]
                : [];
        where.AND = [
            ...existingAnd,
            ...[...optionGroups.entries()].map(([productOptionId, ids]) => ({
                optionValues: {
                    some: {
                        productOptionId,
                        id: {
                            in: ids,
                        },
                    },
                },
            })),
        ];
        return where;
    }
    parseOptionValueIds(optionValueIds) {
        if (!optionValueIds) {
            return [];
        }
        return [...new Set(optionValueIds
                .split(',')
                .map((value) => Number(value.trim()))
                .filter((value) => Number.isInteger(value) && value > 0))];
    }
};
exports.StorefrontService = StorefrontService;
exports.StorefrontService = StorefrontService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        orders_service_1.OrdersService])
], StorefrontService);
//# sourceMappingURL=storefront.service.js.map