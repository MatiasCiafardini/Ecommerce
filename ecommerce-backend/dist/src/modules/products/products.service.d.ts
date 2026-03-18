import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
export declare class ProductsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: CreateProductDto, storeId: number): import("@prisma/client").Prisma.Prisma__ProductClient<{
        id: number;
        createdAt: Date;
        storeId: number;
        description: string | null;
        title: string;
        published: boolean;
        slug: string;
        deletedAt: Date | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findAll(storeId: number): import("@prisma/client").Prisma.PrismaPromise<({
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
    addCategory(productId: number, categoryId: number): Promise<{
        productId: number;
        categoryId: number;
    }>;
    removeCategory(productId: number, categoryId: number): Promise<{
        productId: number;
        categoryId: number;
    }>;
    getCategories(productId: number): Promise<({
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
