import { ShippingProvider, ShippingRate } from './shipping-provider.interface';
export declare class MockShippingProvider implements ShippingProvider {
    getRates(data: {
        postalCode: string;
        weight: number;
        value: number;
    }): Promise<ShippingRate[]>;
}
