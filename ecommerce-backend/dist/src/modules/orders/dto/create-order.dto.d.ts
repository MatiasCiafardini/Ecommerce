export declare class CreateOrderItemDto {
    variantId: number;
    quantity: number;
}
export declare class CreateOrderDto {
    customerId: number;
    items: CreateOrderItemDto[];
}
