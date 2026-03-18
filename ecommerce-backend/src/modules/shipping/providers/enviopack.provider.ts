import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

import { ShippingProvider, ShippingRate } from './shipping-provider.interface';

@Injectable()
export class EnvioPackProvider implements ShippingProvider {
  private apiUrl = 'https://api.enviopack.com';

  async getRates(data: {
    postalCode: string;
    weight: number;
    value: number;
  }): Promise<ShippingRate[]> {
    try {
      const response = await axios.post(`${this.apiUrl}/shipping/rates`, {
        postal_code: data.postalCode,
        weight: data.weight,
        declared_value: data.value,
      });

      const rates = response.data;

      return rates.map((rate: any) => ({
        provider: 'enviopack',
        method: rate.service || rate.name,
        price: rate.price,
        estimatedDays: rate.delivery_days ?? 3,
      }));
    } catch (error) {
      throw new InternalServerErrorException(
        'Error fetching shipping rates from EnvioPack',
      );
    }
  }
}
