import { PrismaService } from '../../prisma/prisma.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
export declare class CartService {
    private prisma;
    constructor(prisma: PrismaService);
    createCart(storeId: number, customerId: number): Promise<{
        id: number;
        createdAt: Date;
        storeId: number;
        deletedAt: Date | null;
        updatedAt: Date;
        customerId: number;
        status: string;
    }>;
    getCart(storeId: number, cartId: number): Promise<{
        items: ({
            variant: {
                product: {
                    id: number;
                    createdAt: Date;
                    storeId: number;
                    description: string | null;
                    title: string;
                    published: boolean;
                    slug: string;
                    deletedAt: Date | null;
                };
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
            };
        } & {
            id: number;
            createdAt: Date;
            variantId: number;
            quantity: number;
            cartId: number;
        })[];
    } & {
        id: number;
        createdAt: Date;
        storeId: number;
        deletedAt: Date | null;
        updatedAt: Date;
        customerId: number;
        status: string;
    }>;
    addItem(storeId: number, cartId: number, dto: AddItemDto): Promise<{
        id: number;
        createdAt: Date;
        variantId: number;
        quantity: number;
        cartId: number;
    }>;
    updateItem(storeId: number, cartId: number, itemId: number, dto: UpdateItemDto): Promise<{
        id: number;
        createdAt: Date;
        variantId: number;
        quantity: number;
        cartId: number;
    }>;
    removeItem(storeId: number, cartId: number, itemId: number): Promise<{
        id: number;
        createdAt: Date;
        variantId: number;
        quantity: number;
        cartId: number;
    }>;
}
