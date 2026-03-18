import { PrismaService } from '../../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
export declare class ProductVariantsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: CreateVariantDto, storeId: number): Promise<{
        id: number;
        length: number | null;
        deletedAt: Date | null;
        productId: number;
        sku: string;
        price: import("@prisma/client/runtime/library").Decimal;
        Size: string | null;
        Color: string | null;
        weight: number | null;
        width: number | null;
        height: number | null;
    }>;
    findByProduct(productId: number, storeId: number): import("@prisma/client").Prisma.PrismaPromise<{
        id: number;
        length: number | null;
        deletedAt: Date | null;
        productId: number;
        sku: string;
        price: import("@prisma/client/runtime/library").Decimal;
        Size: string | null;
        Color: string | null;
        weight: number | null;
        width: number | null;
        height: number | null;
    }[]>;
}
