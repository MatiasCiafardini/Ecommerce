import { PrismaService } from '../../../prisma/prisma.service';
import { Discount } from '@prisma/client';
export declare class AutomaticDiscountService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getActiveAutomaticDiscounts(storeId: number): Promise<Discount[]>;
}
