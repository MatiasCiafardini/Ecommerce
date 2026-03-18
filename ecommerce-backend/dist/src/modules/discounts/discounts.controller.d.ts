import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';
export declare class DiscountsController {
    private discountsService;
    constructor(discountsService: DiscountsService);
    create(req: any, dto: CreateDiscountDto): Promise<{
        id: number;
        name: string;
        createdAt: Date;
        storeId: number;
        value: number | null;
        type: import("@prisma/client").$Enums.DiscountType;
        minimumAmount: number | null;
        automatic: boolean;
        startsAt: Date | null;
        endsAt: Date | null;
    }>;
    findAll(req: any): Promise<({
        coupons: {
            id: number;
            createdAt: Date;
            discountId: number;
            code: string;
            usageLimit: number | null;
            usedCount: number;
        }[];
    } & {
        id: number;
        name: string;
        createdAt: Date;
        storeId: number;
        value: number | null;
        type: import("@prisma/client").$Enums.DiscountType;
        minimumAmount: number | null;
        automatic: boolean;
        startsAt: Date | null;
        endsAt: Date | null;
    })[]>;
    applyCoupon(req: any, dto: ApplyCouponDto): Promise<{
        discountId: number;
        couponId: number;
        code: string;
        amount: number;
        freeShipping: boolean;
    }>;
}
