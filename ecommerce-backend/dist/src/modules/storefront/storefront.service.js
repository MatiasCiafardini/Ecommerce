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
    getProducts(storeId) {
        return this.prisma.product.findMany({
            where: {
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
    getCategories(storeId) {
        return this.prisma.category.findMany({
            where: { storeId },
        });
    }
    async getProductsByCategory(slug, storeId) {
        const category = await this.prisma.category.findFirst({
            where: {
                slug,
                storeId,
            },
            include: {
                products: {
                    include: {
                        product: {
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
                        },
                    },
                },
            },
        });
        if (!category)
            return [];
        return category.products
            .map((p) => p.product)
            .filter((product) => product.published);
    }
    createOrder(dto, storeId) {
        return this.ordersService.create(dto, storeId);
    }
};
exports.StorefrontService = StorefrontService;
exports.StorefrontService = StorefrontService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        orders_service_1.OrdersService])
], StorefrontService);
//# sourceMappingURL=storefront.service.js.map