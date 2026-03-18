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
exports.ProductOptionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ProductOptionsService = class ProductOptionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createOption(storeId, dto) {
        const normalizedName = dto.name.trim();
        const existing = await this.prisma.productOption.findFirst({
            where: {
                storeId,
                name: {
                    equals: normalizedName,
                    mode: 'insensitive',
                },
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('Product option already exists');
        }
        return this.prisma.productOption.create({
            data: {
                storeId,
                name: normalizedName,
            },
        });
    }
    async addValueToProduct(storeId, productId, dto) {
        const normalizedValue = dto.value.trim();
        const [product, option] = await Promise.all([
            this.prisma.product.findFirst({
                where: {
                    id: productId,
                    storeId,
                },
                select: { id: true },
            }),
            this.prisma.productOption.findFirst({
                where: {
                    id: dto.productOptionId,
                    storeId,
                },
                select: { id: true, name: true },
            }),
        ]);
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        if (!option) {
            throw new common_1.NotFoundException('Product option not found');
        }
        const existing = await this.prisma.productOptionValue.findFirst({
            where: {
                productId,
                productOptionId: dto.productOptionId,
                value: {
                    equals: normalizedValue,
                    mode: 'insensitive',
                },
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('Product option value already exists');
        }
        return this.prisma.productOptionValue.create({
            data: {
                productId,
                productOptionId: dto.productOptionId,
                value: normalizedValue,
            },
            include: {
                productOption: true,
                product: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                    },
                },
            },
        });
    }
};
exports.ProductOptionsService = ProductOptionsService;
exports.ProductOptionsService = ProductOptionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductOptionsService);
//# sourceMappingURL=product-options.service.js.map