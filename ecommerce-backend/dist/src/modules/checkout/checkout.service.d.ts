import { PrismaService } from '../../prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { InventoryLockService } from '../inventory-lock/inventory-lock.service';
import { DiscountsService } from '../discounts/discounts.service';
import { DiscountEngineService } from '../discounts/engine/discount-engine.service';
export declare class CheckoutService {
    private prisma;
    private inventoryLockService;
    private discountsService;
    private discountEngine;
    constructor(prisma: PrismaService, inventoryLockService: InventoryLockService, discountsService: DiscountsService, discountEngine: DiscountEngineService);
    checkout(storeId: number, cartId: number, dto: CheckoutDto): Promise<{
        id: number;
        createdAt: Date;
        storeId: number;
        deletedAt: Date | null;
        customerId: number;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        total: import("@prisma/client/runtime/library").Decimal;
        discountCode: string | null;
        status: import("@prisma/client").$Enums.OrderStatus;
        shippingProvider: string | null;
        shippingMethod: string | null;
        shippingCost: import("@prisma/client/runtime/library").Decimal | null;
        idempotencyKey: string | null;
        discountId: number | null;
    }>;
    private ensureCustomer;
}
