import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class InventoryLockService {
    private prisma;
    constructor(prisma: PrismaService);
    reserveStock(storeId: number, variantId: number, quantity: number): Promise<{
        id: number;
        storeId: number;
        variantId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
    }>;
    reserveStockTx(tx: Prisma.TransactionClient, storeId: number, variantId: number, quantity: number): Promise<{
        id: number;
        storeId: number;
        variantId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
    }>;
    releaseStock(storeId: number, variantId: number, quantity: number): Promise<{
        id: number;
        storeId: number;
        variantId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
    }>;
    releaseStockTx(tx: Prisma.TransactionClient, storeId: number, variantId: number, quantity: number): Promise<{
        id: number;
        storeId: number;
        variantId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
    }>;
    confirmStock(storeId: number, variantId: number, quantity: number): Promise<{
        id: number;
        storeId: number;
        variantId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
    }>;
    confirmStockTx(tx: Prisma.TransactionClient, storeId: number, variantId: number, quantity: number): Promise<{
        id: number;
        storeId: number;
        variantId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
    }>;
}
