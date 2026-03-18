import { ProductVariantsService } from './product-variants.service';
import { CreateVariantDto } from './dto/create-variant.dto';
export declare class ProductVariantsController {
    private variantsService;
    constructor(variantsService: ProductVariantsService);
    create(createVariantDto: CreateVariantDto, req: any): Promise<{
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
    findByProduct(productId: string, req: any): import("@prisma/client").Prisma.PrismaPromise<{
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
