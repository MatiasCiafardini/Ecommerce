import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class ProductsController {
    private productsService;
    constructor(productsService: ProductsService);
    create(dto: CreateProductDto, req: any): import("@prisma/client").Prisma.Prisma__ProductClient<{
        id: number;
        title: string;
        description: string | null;
        slug: string;
        published: boolean;
        storeId: number;
        createdAt: Date;
        deletedAt: Date | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findAll(req: any): import("@prisma/client").Prisma.PrismaPromise<({
        variants: {
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
        }[];
        images: {
            id: number;
            position: number;
            productId: number;
            url: string;
        }[];
        categories: ({
            category: {
                id: number;
                slug: string;
                storeId: number;
                createdAt: Date;
                deletedAt: Date | null;
                name: string;
            };
        } & {
            productId: number;
            categoryId: number;
        })[];
    } & {
        id: number;
        title: string;
        description: string | null;
        slug: string;
        published: boolean;
        storeId: number;
        createdAt: Date;
        deletedAt: Date | null;
    })[]>;
    update(id: string, dto: UpdateProductDto, req: any): Promise<({
        variants: {
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
        }[];
        images: {
            id: number;
            position: number;
            productId: number;
            url: string;
        }[];
        categories: ({
            category: {
                id: number;
                slug: string;
                storeId: number;
                createdAt: Date;
                deletedAt: Date | null;
                name: string;
            };
        } & {
            productId: number;
            categoryId: number;
        })[];
    } & {
        id: number;
        title: string;
        description: string | null;
        slug: string;
        published: boolean;
        storeId: number;
        createdAt: Date;
        deletedAt: Date | null;
    }) | null>;
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
            slug: string;
            storeId: number;
            createdAt: Date;
            deletedAt: Date | null;
            name: string;
        };
    } & {
        productId: number;
        categoryId: number;
    })[]>;
}
