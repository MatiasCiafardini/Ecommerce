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
exports.DiscountsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let DiscountsService = class DiscountsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(storeId, dto) {
        return this.prisma.discount.create({
            data: {
                storeId,
                name: dto.name,
                type: dto.type,
                value: dto.value,
                minimumAmount: dto.minimumAmount,
                automatic: dto.automatic ?? false,
            },
        });
    }
    async findAll(storeId) {
        return this.prisma.discount.findMany({
            where: {
                storeId,
            },
            include: {
                coupons: true,
            },
        });
    }
    async applyCoupon(storeId, code, subtotal) {
        const coupon = await this.prisma.coupon.findUnique({
            where: {
                code,
            },
            include: {
                discount: true,
            },
        });
        if (!coupon) {
            throw new common_1.NotFoundException('Coupon not found');
        }
        const discount = coupon.discount;
        if (!discount) {
            throw new common_1.NotFoundException('Discount not found for this coupon');
        }
        if (discount.storeId !== storeId) {
            throw new common_1.BadRequestException('Coupon invalid for this store');
        }
        const now = new Date();
        if (discount.startsAt && discount.startsAt > now) {
            throw new common_1.BadRequestException('Coupon not active yet');
        }
        if (discount.endsAt && discount.endsAt < now) {
            throw new common_1.BadRequestException('Coupon expired');
        }
        if (discount.minimumAmount && subtotal < discount.minimumAmount) {
            throw new common_1.BadRequestException('Minimum order amount not reached');
        }
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            throw new common_1.BadRequestException('Coupon usage limit reached');
        }
        let discountAmount = 0;
        const value = discount.value ?? 0;
        if (discount.type === 'percentage') {
            discountAmount = subtotal * (value / 100);
        }
        if (discount.type === 'fixed_amount') {
            discountAmount = value;
        }
        return {
            discountId: discount.id,
            couponId: coupon.id,
            code: coupon.code,
            amount: discountAmount,
            freeShipping: discount.type === 'free_shipping',
        };
    }
};
exports.DiscountsService = DiscountsService;
exports.DiscountsService = DiscountsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DiscountsService);
//# sourceMappingURL=discounts.service.js.map