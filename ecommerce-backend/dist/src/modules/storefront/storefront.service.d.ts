import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
export declare class StorefrontService {
    private prisma;
    private ordersService;
    constructor(prisma: PrismaService, ordersService: OrdersService);
    getStoreConfig(domain: string): Promise<{
        storeId: number;
        theme: string;
    }>;
    getProducts(storeId: number): import("@prisma/client").Prisma.PrismaPromise<({
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
    getProduct(slug: string, storeId: number): import("@prisma/client").Prisma.Prisma__ProductClient<({
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
    getCategories(storeId: number): import("@prisma/client").Prisma.PrismaPromise<{
        id: number;
        name: string;
        createdAt: Date;
        storeId: number;
        slug: string;
        deletedAt: Date | null;
    }[]>;
    getProductsByCategory(slug: string, storeId: number): Promise<({
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
    createOrder(dto: CreateOrderDto, storeId: number): Promise<{
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
