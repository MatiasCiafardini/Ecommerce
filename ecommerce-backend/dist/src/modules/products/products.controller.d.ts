import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
export declare class ProductsController {
    private productsService;
    constructor(productsService: ProductsService);
    create(dto: CreateProductDto, req: any): import("@prisma/client").Prisma.Prisma__ProductClient<{
        id: number;
        createdAt: Date;
        storeId: number;
        description: string | null;
        title: string;
        published: boolean;
        slug: string;
        deletedAt: Date | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findAll(req: any): import("@prisma/client").Prisma.PrismaPromise<({
        categories: ({
            category: {
                id: number;
                name: string;
                createdAt: Date;
                storeId: number;
                slug: string;
                deletedAt: Date | null;
            };
        } & {
            productId: number;
            categoryId: number;
        })[];
        variants: {
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
        }[];
        images: {
            id: number;
            productId: number;
            url: string;
            position: number;
        }[];
    } & {
        id: number;
        createdAt: Date;
        storeId: number;
        description: string | null;
        title: string;
        published: boolean;
        slug: string;
        deletedAt: Date | null;
    })[]>;
    addCategory(id: string, categoryId: string): Promise<{
        productId: number;
        categoryId: number;
    }>;
    removeCategory(id: string, categoryId: string): Promise<{
        productId: number;
        categoryId: number;
    }>;
    getCategories(id: string): Promise<({
        category: {
            id: number;
            name: string;
            createdAt: Date;
            storeId: number;
            slug: string;
            deletedAt: Date | null;
        };
    } & {
        productId: number;
        categoryId: number;
    })[]>;
}
