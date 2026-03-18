import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { GetStoreProductsDto } from './dto/get-store-products.dto';
import { Prisma } from '@prisma/client';
export declare class StorefrontService {
    private prisma;
    private ordersService;
    constructor(prisma: PrismaService, ordersService: OrdersService);
    getStoreConfig(domain: string): Promise<{
        storeId: number;
        theme: string;
    }>;
    getProducts(storeId: number, query?: GetStoreProductsDto): Promise<({
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
            price: Prisma.Decimal;
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
    getStoreProductOptions(storeId: number): Prisma.PrismaPromise<({
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
    getProduct(slug: string, storeId: number): Prisma.Prisma__ProductClient<({
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
            price: Prisma.Decimal;
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
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    getProductOptions(slug: string, storeId: number): Promise<({
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
    getCategories(storeId: number): Prisma.PrismaPromise<{
        id: number;
        name: string;
        createdAt: Date;
        storeId: number;
        slug: string;
        deletedAt: Date | null;
    }[]>;
    getProductsByCategory(slug: string, storeId: number, query?: GetStoreProductsDto): Promise<({
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
            price: Prisma.Decimal;
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
            price: Prisma.Decimal;
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
        subtotal: Prisma.Decimal;
        discountAmount: Prisma.Decimal;
        total: Prisma.Decimal;
        discountCode: string | null;
        status: import("@prisma/client").$Enums.OrderStatus;
        shippingProvider: string | null;
        shippingMethod: string | null;
        shippingCost: Prisma.Decimal | null;
        idempotencyKey: string | null;
        discountId: number | null;
    }>;
    private productInclude;
    private buildProductsWhere;
    private parseOptionValueIds;
}
