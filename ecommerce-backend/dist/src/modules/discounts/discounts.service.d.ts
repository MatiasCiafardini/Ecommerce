import { PrismaService } from '../../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
export declare class DiscountsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(storeId: number, dto: CreateDiscountDto): Promise<{
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
    findAll(storeId: number): Promise<({
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
    applyCoupon(storeId: number, code: string, subtotal: number): Promise<{
        discountId: number;
        couponId: number;
        code: string;
        amount: number;
        freeShipping: boolean;
    }>;
}
