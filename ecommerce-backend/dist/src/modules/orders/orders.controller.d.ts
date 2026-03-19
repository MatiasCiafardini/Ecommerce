import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
export declare class OrdersController {
    private ordersService;
    constructor(ordersService: OrdersService);
    create(dto: CreateOrderDto, req: any): Promise<{
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
    findAll(req: any): import("@prisma/client").Prisma.PrismaPromise<({
        payments: {
            id: number;
            storeId: number;
            createdAt: Date;
            status: string;
            idempotencyKey: string | null;
            orderId: number;
            amount: import("@prisma/client/runtime/library").Decimal;
            provider: string;
            externalId: string | null;
        }[];
        customer: {
            id: number;
            email: string;
            firstName: string | null;
            lastName: string | null;
            phone: string | null;
        };
        shipment: ({
            trackingEvents: {
                id: string;
                description: string | null;
                createdAt: Date;
                status: import("@prisma/client").$Enums.ShipmentStatus;
                shipmentId: string;
                location: string | null;
            }[];
        } & {
            id: string;
            storeId: number;
            createdAt: Date;
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
                        position: number;
                        productId: number;
                        url: string;
                    }[];
                } & {
                    id: number;
                    title: string;
                    description: string | null;
                    slug: string;
                    published: boolean;
                    storeId: number;
                    createdAt: Date;
                    deletedAt: Date | null;
                };
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
            };
        } & {
            id: number;
            price: import("@prisma/client/runtime/library").Decimal;
            quantity: number;
            variantId: number;
            returnedQuantity: number;
            orderId: number;
        })[];
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
    })[]>;
    findOne(id: string, req: any): import("@prisma/client").Prisma.Prisma__OrderClient<({
        payments: {
            id: number;
            storeId: number;
            createdAt: Date;
            status: string;
            idempotencyKey: string | null;
            orderId: number;
            amount: import("@prisma/client/runtime/library").Decimal;
            provider: string;
            externalId: string | null;
        }[];
        customer: {
            id: number;
            email: string;
            firstName: string | null;
            lastName: string | null;
            phone: string | null;
        };
        shipment: ({
            trackingEvents: {
                id: string;
                description: string | null;
                createdAt: Date;
                status: import("@prisma/client").$Enums.ShipmentStatus;
                shipmentId: string;
                location: string | null;
            }[];
        } & {
            id: string;
            storeId: number;
            createdAt: Date;
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
                        position: number;
                        productId: number;
                        url: string;
                    }[];
                } & {
                    id: number;
                    title: string;
                    description: string | null;
                    slug: string;
                    published: boolean;
                    storeId: number;
                    createdAt: Date;
                    deletedAt: Date | null;
                };
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
            };
        } & {
            id: number;
            price: import("@prisma/client/runtime/library").Decimal;
            quantity: number;
            variantId: number;
            returnedQuantity: number;
            orderId: number;
        })[];
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
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    updateStatus(id: string, dto: UpdateOrderStatusDto, req: any): Promise<{
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
