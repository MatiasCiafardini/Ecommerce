import { Injectable } from '@nestjs/common';
import {
  ProviderShipment,
  ProviderTrackingEvent,
  ShippingProvider,
  ShippingRate,
  ShipmentProvisionRequest,
} from './shipping-provider.interface';

@Injectable()
export class MockShippingProvider implements ShippingProvider {
  readonly providerCode = 'mock';

  async getRates(): Promise<ShippingRate[]> {
    return [
      {
        provider: 'andreani',
        method: 'standard',
        price: 2500,
        estimatedDays: 3,
        carrierId: 'andreani',
        carrierName: 'Andreani',
        serviceCode: 'N',
        modalityCode: 'D',
        dispatchType: 'D',
        sellerCost: 1800,
      },
      {
        provider: 'correo-argentino',
        method: 'clasico',
        price: 2200,
        estimatedDays: 4,
        carrierId: 'correo-argentino',
        carrierName: 'Correo Argentino',
        serviceCode: 'N',
        modalityCode: 'D',
        dispatchType: 'D',
        sellerCost: 1600,
      },
      {
        provider: 'store',
        method: 'pickup',
        price: 0,
        estimatedDays: 0,
      },
    ];
  }

  async createShipment(
    data: ShipmentProvisionRequest,
  ): Promise<ProviderShipment> {
    const token = `${data.orderId}${Date.now().toString().slice(-6)}`;

    return {
      provider: 'mock',
      method: data.method,
      externalShipmentId: `mock-${token}`,
      trackingNumber: `MOCK-${token}`,
      trackingUrl: `https://tracking.mock.local/${token}`,
      labelUrl: `https://labels.mock.local/${token}.pdf`,
      labelFormat: 'pdf',
      status: 'created',
      events: [
        {
          status: 'created',
          description:
            'Etiqueta simulada generada automaticamente para entorno de desarrollo.',
        },
      ],
    };
  }

  async getTracking(): Promise<ProviderTrackingEvent[]> {
    return [];
  }

  async testConnection() {
    return {
      ok: true,
      message: 'Mock shipping provider is always available',
    };
  }
}
