import { ProductVariantsService } from './product-variants.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
export declare class ProductVariantsController {
    private variantsService;
    constructor(variantsService: ProductVariantsService);
    create(createVariantDto: CreateVariantDto, req: any): Promise<{
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
    update(id: string, updateVariantDto: UpdateVariantDto, req: any): Promise<({
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
    remove(id: string, req: any): Promise<{
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
    findByProduct(productId: string, req: any): import("@prisma/client").Prisma.PrismaPromise<({
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
