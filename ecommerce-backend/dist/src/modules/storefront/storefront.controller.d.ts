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
        variants: ({
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
        })[];
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
    getStoreProductOptions(req: any): import("@prisma/client").Prisma.PrismaPromise<({
        values: {
            id: number;
            productId: number;
            value: string;
        }[];
    } & {
        id: number;
        storeId: number;
        createdAt: Date;
        name: string;
    })[]>;
    getProduct(slug: string, req: any): import("@prisma/client").Prisma.Prisma__ProductClient<({
        variants: ({
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
        })[];
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
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    getProductOptions(slug: string, req: any): Promise<({
        values: {
            id: number;
            productId: number;
            value: string;
        }[];
    } & {
        id: number;
        storeId: number;
        createdAt: Date;
        name: string;
    })[] | null>;
    getCategories(req: any): import("@prisma/client").Prisma.PrismaPromise<{
        id: number;
        slug: string;
        storeId: number;
        createdAt: Date;
        deletedAt: Date | null;
        name: string;
    }[]>;
    getProductsByCategory(slug: string, req: any, query: GetStoreProductsDto): Promise<({
        variants: ({
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
        })[];
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
    createOrder(dto: CreateOrderDto, req: any): Promise<{
        items: {
            id: number;
            price: import("@prisma/client/runtime/library").Decimal;
            quantity: number;
            variantId: number;
            returnedQuantity: number;
            orderId: number;
        }[];
    } & {
        id: number;
        storeId: number;
        createdAt: Date;
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
