import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class InventoryLockService {
    private prisma;
    constructor(prisma: PrismaService);
    reserveStock(storeId: number, variantId: number, quantity: number): Promise<{
        id: number;
        storeId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
        variantId: number;
    }>;
    reserveStockTx(tx: Prisma.TransactionClient, storeId: number, variantId: number, quantity: number): Promise<{
        id: number;
        storeId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
        variantId: number;
    }>;
    releaseStock(storeId: number, variantId: number, quantity: number): Promise<{
        id: number;
        storeId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
        variantId: number;
    }>;
    releaseStockTx(tx: Prisma.TransactionClient, storeId: number, variantId: number, quantity: number): Promise<{
        id: number;
        storeId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
        variantId: number;
    }>;
    confirmStock(storeId: number, variantId: number, quantity: number): Promise<{
        id: number;
        storeId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
        variantId: number;
    }>;
    confirmStockTx(tx: Prisma.TransactionClient, storeId: number, variantId: number, quantity: number): Promise<{
        id: number;
        storeId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
        variantId: number;
    }>;
}
