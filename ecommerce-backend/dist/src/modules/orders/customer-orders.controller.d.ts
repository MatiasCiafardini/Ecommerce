import { OrdersService } from './orders.service';
export declare class CustomerOrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    findMine(req: any): import("@prisma/client").Prisma.PrismaPromise<({
        payments: {
            id: number;
            createdAt: Date;
            storeId: number;
            status: string;
            idempotencyKey: string | null;
            orderId: number;
            amount: import("@prisma/client/runtime/library").Decimal;
            provider: string;
            externalId: string | null;
        }[];
        shipment: ({
            trackingEvents: {
                id: string;
                createdAt: Date;
                description: string | null;
                status: import("@prisma/client").$Enums.ShipmentStatus;
                shipmentId: string;
                location: string | null;
            }[];
        } & {
            id: string;
            createdAt: Date;
            storeId: number;
            weight: number | null;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.ShipmentStatus;
            orderId: number;
            method: string;
            provider: string;
            shippingAddress: string;
            postalCode: string;
            trackingNumber: string | null;
            trackingUrl: string | null;
        }) | null;
        items: ({
            variant: {
                product: {
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
                };
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
            };
        } & {
            id: number;
            price: import("@prisma/client/runtime/library").Decimal;
            variantId: number;
            quantity: number;
            returnedQuantity: number;
            orderId: number;
        })[];
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
    })[]>;
    findOneMine(id: string, req: any): Promise<{
        payments: {
            id: number;
            createdAt: Date;
            storeId: number;
            status: string;
            idempotencyKey: string | null;
            orderId: number;
            amount: import("@prisma/client/runtime/library").Decimal;
            provider: string;
            externalId: string | null;
        }[];
        shipment: ({
            trackingEvents: {
                id: string;
                createdAt: Date;
                description: string | null;
                status: import("@prisma/client").$Enums.ShipmentStatus;
                shipmentId: string;
                location: string | null;
            }[];
        } & {
            id: string;
            createdAt: Date;
            storeId: number;
            weight: number | null;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.ShipmentStatus;
            orderId: number;
            method: string;
            provider: string;
            shippingAddress: string;
            postalCode: string;
            trackingNumber: string | null;
            trackingUrl: string | null;
        }) | null;
        items: ({
            variant: {
                product: {
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
                };
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
            };
        } & {
            id: number;
            price: import("@prisma/client/runtime/library").Decimal;
            variantId: number;
            quantity: number;
            returnedQuantity: number;
            orderId: number;
        })[];
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
