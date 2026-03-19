import { PrismaService } from '../../prisma/prisma.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
export declare class CartService {
    private prisma;
    constructor(prisma: PrismaService);
    createCart(storeId: number, customerId: number): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        deletedAt: Date | null;
        updatedAt: Date;
        customerId: number;
        status: string;
    }>;
    getCart(storeId: number, cartId: number, customerId: number): Promise<{
        items: ({
            variant: {
                product: {
                    id: number;
                    title: string;
                    description: string | null;
                    slug: string;
                    published: boolean;
                    storeId: number;
                    createdAt: Date;
                    deletedAt: Date | null;
                };
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
            };
        } & {
            id: number;
            createdAt: Date;
            quantity: number;
            variantId: number;
            cartId: number;
        })[];
    } & {
        id: number;
        storeId: number;
        createdAt: Date;
        deletedAt: Date | null;
        updatedAt: Date;
        customerId: number;
        status: string;
    }>;
    addItem(storeId: number, cartId: number, customerId: number, dto: AddItemDto): Promise<{
        id: number;
        createdAt: Date;
        quantity: number;
        variantId: number;
        cartId: number;
    }>;
    updateItem(storeId: number, cartId: number, itemId: number, customerId: number, dto: UpdateItemDto): Promise<{
        id: number;
        createdAt: Date;
        quantity: number;
        variantId: number;
        cartId: number;
    }>;
    removeItem(storeId: number, cartId: number, itemId: number, customerId: number): Promise<{
        id: number;
        createdAt: Date;
        quantity: number;
        variantId: number;
        cartId: number;
    }>;
    clearCart(storeId: number, cartId: number, customerId: number): Promise<import("@prisma/client").Prisma.BatchPayload>;
    private ensureCustomer;
}
