export declare class MercadoPagoProvider {
    private client;
    private accessToken;
    constructor();
    createPayment(data: any): Promise<import("mercadopago/dist/clients/payment/commonTypes").PaymentResponse>;
    getPayment(paymentId: string): Promise<import("mercadopago/dist/clients/payment/commonTypes").PaymentResponse>;
    refundPayment(paymentId: string, amount?: number): Promise<any>;
}
