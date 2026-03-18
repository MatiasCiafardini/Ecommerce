import { ShippingProvider, ShippingRate } from './shipping-provider.interface';
export declare class EnvioPackProvider implements ShippingProvider {
    private apiUrl;
    getRates(data: {
        postalCode: string;
        weight: number;
        value: number;
    }): Promise<ShippingRate[]>;
}
