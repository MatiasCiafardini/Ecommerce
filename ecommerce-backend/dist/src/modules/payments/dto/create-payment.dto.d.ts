export declare class CreatePaymentDto {
    token: string;
    paymentMethodId: string;
    installments: number;
    issuerId: string;
    idempotencyKey: string;
}
