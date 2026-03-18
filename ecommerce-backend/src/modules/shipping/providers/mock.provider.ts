import { Injectable } from '@nestjs/common';
import { ShippingProvider, ShippingRate } from './shipping-provider.interface';

@Injectable()
export class MockShippingProvider implements ShippingProvider {
  async getRates(data: {
    postalCode: string;
    weight: number;
    value: number;
  }): Promise<ShippingRate[]> {
    return [
      {
        provider: 'andreani',
        method: 'standard',
        price: 2500,
        estimatedDays: 3,
      },
      {
        provider: 'correo-argentino',
        method: 'clasico',
        price: 2200,
        estimatedDays: 4,
      },
      {
        provider: 'store',
        method: 'pickup',
        price: 0,
        estimatedDays: 0,
      },
    ];
  }
}
