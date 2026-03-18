import { PrismaService } from '../../../prisma/prisma.service';
type AutomaticDiscountResult = {
    discountId: number;
    discountAmount: number;
    freeShipping: boolean;
};
export declare class DiscountEngineService {
    private prisma;
    constructor(prisma: PrismaService);
    calculateAutomaticDiscount({ storeId, subtotal, }: {
        storeId: number;
        subtotal: number;
    }): Promise<AutomaticDiscountResult | null>;
}
export {};
