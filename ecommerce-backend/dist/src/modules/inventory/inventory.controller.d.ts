import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
export declare class InventoryController {
    private inventoryService;
    constructor(inventoryService: InventoryService);
    create(dto: CreateInventoryDto, req: any): import("@prisma/client").Prisma.Prisma__InventoryClient<{
        id: number;
        storeId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
        variantId: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    find(variantId: string, req: any): Promise<{
        id: number;
        storeId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
        variantId: number;
    }>;
    update(variantId: string, quantity: number, req: any): Promise<{
        id: number;
        storeId: number;
        quantity: number;
        reserved: number;
        updatedAt: Date;
        variantId: number;
    }>;
}
