export interface ShippingRate {
    provider: string;
    method: string;
    price: number;
    estimatedDays: number;
}
export interface ShippingProvider {
    getRates(data: {
        postalCode: string;
        weight: number;
        value: number;
    }): Promise<ShippingRate[]>;
}
