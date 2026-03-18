import { CartService } from './cart.service';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateCartDto } from './dto/create-cart.dto';
export declare class CartController {
    private readonly cartService;
    constructor(cartService: CartService);
    createCart(req: any, _dto: CreateCartDto): Promise<{
        id: number;
        createdAt: Date;
        storeId: number;
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
    addItem(req: any, id: string, dto: AddItemDto): Promise<{
        id: number;
        createdAt: Date;
        variantId: number;
        quantity: number;
        cartId: number;
    }>;
    updateItem(req: any, id: string, itemId: string, dto: UpdateItemDto): Promise<{
        id: number;
        createdAt: Date;
        variantId: number;
        quantity: number;
        cartId: number;
    }>;
    removeItem(req: any, id: string, itemId: string): Promise<{
        id: number;
        createdAt: Date;
        variantId: number;
        quantity: number;
        cartId: number;
    }>;
    clearCart(req: any, id: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
}
