import { StorefrontService } from './storefront.service';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { GetStoreProductsDto } from './dto/get-store-products.dto';
export declare class StorefrontController {
    private storefrontService;
    constructor(storefrontService: StorefrontService);
    getConfig(req: any): Promise<{
        storeId: number;
        theme: string;
    }>;
    getProducts(req: any, query: GetStoreProductsDto): Promise<({
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
        variants: ({
            inventories: {
                id: number;
                storeId: number;
                variantId: number;
                quantity: number;
                reserved: number;
                updatedAt: Date;
            }[];
        } & {
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
        })[];
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
    getStoreProductOptions(req: any): import("@prisma/client").Prisma.PrismaPromise<({
        values: {
            id: number;
            value: string;
            productId: number;
        }[];
    } & {
        id: number;
        name: string;
        createdAt: Date;
        storeId: number;
    })[]>;
    getProduct(slug: string, req: any): import("@prisma/client").Prisma.Prisma__ProductClient<({
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
        variants: ({
            inventories: {
                id: number;
                storeId: number;
                variantId: number;
                quantity: number;
                reserved: number;
                updatedAt: Date;
            }[];
        } & {
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
        })[];
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
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    getProductOptions(slug: string, req: any): Promise<({
        values: {
            id: number;
            value: string;
            productId: number;
        }[];
    } & {
        id: number;
        name: string;
        createdAt: Date;
        storeId: number;
    })[] | null>;
    getCategories(req: any): import("@prisma/client").Prisma.PrismaPromise<{
        id: number;
        name: string;
        createdAt: Date;
        storeId: number;
        slug: string;
        deletedAt: Date | null;
    }[]>;
    getProductsByCategory(slug: string, req: any, query: GetStoreProductsDto): Promise<({
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
        variants: ({
            inventories: {
                id: number;
                storeId: number;
                variantId: number;
                quantity: number;
                reserved: number;
                updatedAt: Date;
            }[];
        } & {
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
        })[];
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
    createOrder(dto: CreateOrderDto, req: any): Promise<{
        items: {
            id: number;
            price: import("@prisma/client/runtime/library").Decimal;
            variantId: number;
            quantity: number;
            returnedQuantity: number;
            orderId: number;
        }[];
    } & {
        id: number;
        createdAt: Date;
        storeId: number;
        deletedAt: Date | null;
        customerId: number;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        total: import("@prisma/client/runtime/library").Decimal;
        discountCode: string | null;
        status: import("@prisma/client").$Enums.OrderStatus;
        shippingProvider: string | null;
        shippingMethod: string | null;
        shippingCost: import("@prisma/client/runtime/library").Decimal | null;
        idempotencyKey: string | null;
        discountId: number | null;
    }>;
}
