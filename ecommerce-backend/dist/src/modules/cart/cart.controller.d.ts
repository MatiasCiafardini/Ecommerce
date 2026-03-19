import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateCartDto } from './dto/create-cart.dto';
export declare class CartController {
    private readonly cartService;
    constructor(cartService: CartService);
    createCart(req: any, _dto: CreateCartDto): Promise<{
        id: number;
        storeId: number;
        createdAt: Date;
        deletedAt: Date | null;
        updatedAt: Date;
        customerId: number;
        status: string;
    }>;
    getCart(req: any, id: string): Promise<{
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
    addItem(req: any, id: string, dto: AddItemDto): Promise<{
        id: number;
        createdAt: Date;
        quantity: number;
        variantId: number;
        cartId: number;
    }>;
    updateItem(req: any, id: string, itemId: string, dto: UpdateItemDto): Promise<{
        id: number;
        createdAt: Date;
        quantity: number;
        variantId: number;
        cartId: number;
    }>;
    removeItem(req: any, id: string, itemId: string): Promise<{
        id: number;
        createdAt: Date;
        quantity: number;
        variantId: number;
        cartId: number;
    }>;
    clearCart(req: any, id: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
