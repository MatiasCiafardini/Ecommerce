export declare class CheckoutDto {
    customerId: number;
    shippingProvider?: string;
    shippingMethod?: string;
    shippingCost?: number;
    couponCode?: string;
    idempotencyKey?: string;
}
