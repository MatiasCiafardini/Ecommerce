import { PrismaService } from '../../prisma/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
export declare class InventoryService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateInventoryDto, storeId: number): import("@prisma/client").Prisma.Prisma__InventoryClient<{
        id: number;
        storeId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
        variantId: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findByVariant(variantId: number, storeId: number): Promise<{
        id: number;
        storeId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
        variantId: number;
    }>;
    updateStock(variantId: number, quantity: number, storeId: number): Promise<{
        id: number;
        storeId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
        variantId: number;
    }>;
}
