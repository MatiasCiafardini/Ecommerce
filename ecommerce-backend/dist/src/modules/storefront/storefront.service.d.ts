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
            price: Prisma.Decimal;
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
    getStoreProductOptions(storeId: number): Prisma.PrismaPromise<({
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
    getProduct(slug: string, storeId: number): Prisma.Prisma__ProductClient<({
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
            price: Prisma.Decimal;
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
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
    getProductOptions(slug: string, storeId: number): Promise<({
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
    getCategories(storeId: number): Prisma.PrismaPromise<{
        id: number;
        slug: string;
        storeId: number;
        createdAt: Date;
        deletedAt: Date | null;
        name: string;
    }[]>;
    getProductsByCategory(slug: string, storeId: number, query?: GetStoreProductsDto): Promise<({
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
            price: Prisma.Decimal;
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
    createOrder(dto: CreateOrderDto, storeId: number): Promise<{
        items: {
            id: number;
            price: Prisma.Decimal;
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
