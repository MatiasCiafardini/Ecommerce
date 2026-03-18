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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const slug_util_1 = require("../../common/utils/slug.util");
let ProductsService = class ProductsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(data, storeId) {
        const slug = (0, slug_util_1.generateSlug)(data.title);
        return this.prisma.product.create({
            data: {
                title: data.title,
                description: data.description,
                slug,
                published: data.published ?? false,
                storeId,
            },
        });
    }
    findAll(storeId) {
        return this.prisma.product.findMany({
            where: {
                storeId,
            },
            include: {
                variants: true,
                images: true,
                categories: {
                    include: {
                        category: true,
                    },
                },
            },
        });
    }
    async addCategory(productId, categoryId) {
        return this.prisma.productCategory.create({
            data: {
                productId,
                categoryId,
            },
        });
    }
    async removeCategory(productId, categoryId) {
        return this.prisma.productCategory.delete({
            where: {
                productId_categoryId: {
                    productId,
                    categoryId,
                },
            },
        });
    }
    async getCategories(productId) {
        return this.prisma.productCategory.findMany({
            where: { productId },
            include: {
                category: true,
            },
        });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductsService);
//# sourceMappingURL=products.service.js.map