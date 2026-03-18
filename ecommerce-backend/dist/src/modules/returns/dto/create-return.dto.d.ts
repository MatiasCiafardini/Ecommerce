export declare class CreateReturnItemDto {
    orderItemId: number;
    quantity: number;
}
export declare class CreateReturnDto {
    orderId: number;
    reason?: string;
    items: CreateReturnItemDto[];
}
