import { PrismaService } from '../../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
export declare class ProductVariantsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: CreateVariantDto, storeId: number): Promise<{
        inventories: {
            id: number;
            storeId: number;
            quantity: number;
            reserved: number;
            updatedAt: Date;
            variantId: number;
        }[];
    } & {
        id: number;
        deletedAt: Date | null;
        productId: number;
        length: number | null;
        sku: string;
        price: import("@prisma/client/runtime/library").Decimal;
        Size: string | null;
        Color: string | null;
        weight: number | null;
        width: number | null;
        height: number | null;
    }>;
    update(variantId: number, data: UpdateVariantDto, storeId: number): Promise<({
        inventories: {
            id: number;
            storeId: number;
            quantity: number;
            reserved: number;
            updatedAt: Date;
            variantId: number;
        }[];
    } & {
        id: number;
        deletedAt: Date | null;
        productId: number;
        length: number | null;
        sku: string;
        price: import("@prisma/client/runtime/library").Decimal;
        Size: string | null;
        Color: string | null;
        weight: number | null;
        width: number | null;
        height: number | null;
    }) | null>;
    remove(variantId: number, storeId: number): Promise<{
        id: number;
        deletedAt: Date | null;
        productId: number;
        length: number | null;
        sku: string;
        price: import("@prisma/client/runtime/library").Decimal;
        Size: string | null;
        Color: string | null;
        weight: number | null;
        width: number | null;
        height: number | null;
    }>;
    findByProduct(productId: number, storeId: number): import("@prisma/client").Prisma.PrismaPromise<({
        inventories: {
            id: number;
            storeId: number;
            quantity: number;
            reserved: number;
            updatedAt: Date;
            variantId: number;
        }[];
    } & {
        id: number;
        deletedAt: Date | null;
        productId: number;
        length: number | null;
        sku: string;
        price: import("@prisma/client/runtime/library").Decimal;
        Size: string | null;
        Color: string | null;
        weight: number | null;
        width: number | null;
        height: number | null;
    })[]>;
}
