import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class ProductsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: CreateProductDto, storeId: number): import("@prisma/client").Prisma.Prisma__ProductClient<{
        id: number;
        title: string;
        description: string | null;
        slug: string;
        published: boolean;
        storeId: number;
        createdAt: Date;
        deletedAt: Date | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findAll(storeId: number): import("@prisma/client").Prisma.PrismaPromise<({
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
    update(productId: number, data: UpdateProductDto, storeId: number): Promise<({
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
