import { Injectable } from '@nestjs/common';

import {
  ResolvedShippingProviderConfig,
  ShippingProvider,
  ShippingProviderContext,
  ShippingRate,
  ShippingRateRequest,
} from './shipping-provider.interface';
import { StoreShippingMethodsService } from '../services/store-shipping-methods.service';

@Injectable()
export class ManualShippingProvider implements ShippingProvider {
  readonly providerCode = 'manual';

  constructor(
    private readonly storeShippingMethodsService: StoreShippingMethodsService,
  ) {}

  async getRates(
    _data: ShippingRateRequest,
    context?: ShippingProviderContext,
  ): Promise<ShippingRate[]> {
    if (context?.storeId) {
      const storeMethods = await this.storeShippingMethodsService.findActive(
        context.storeId,
      );

      if (storeMethods.length > 0) {
        return storeMethods.map((method) => ({
          provider: 'manual',
          method: method.name,
          price: Number(method.price),
          estimatedDays: 0,
          description: method.description ?? undefined,
          storeShippingMethodId: method.id,
          methodType: method.type,
          carrierId: method.type === 'pickup' ? 'store' : 'manual',
          carrierName: method.name,
          serviceCode: method.type,
          modalityCode: method.type === 'pickup' ? 'pickup' : 'manual',
          dispatchType: method.type,
          metadata: {
            description: method.description,
            storeShippingMethodId: method.id,
            methodType: method.type,
          },
        }));
      }
    }

    const config = this.getConfig(context?.config);
    const manualOptions = this.extractManualOptions(config);

    if (manualOptions.length) {
      return manualOptions;
    }

    return [
      {
        provider: 'manual',
        method: 'Retiro en local',
        price: 0,
        estimatedDays: 0,
        carrierId: 'store',
        carrierName: 'Retiro en local',
        serviceCode: 'pickup',
        modalityCode: 'pickup',
        dispatchType: 'pickup',
      },
      {
        provider: 'manual',
        method: 'Envio a coordinar',
        price: 0,
        estimatedDays: 0,
        carrierId: 'manual',
        carrierName: 'Envio a coordinar',
        serviceCode: 'coordinar',
        modalityCode: 'manual',
        dispatchType: 'manual',
      },
    ];
  }

  async testConnection() {
    return {
      ok: true,
      message: 'Manual shipping provider is always available',
    };
  }

  private getConfig(config?: ResolvedShippingProviderConfig | null) {
    return {
      metadata: (config?.metadata ?? {}) as Record<string, unknown>,
    };
  }

  private extractManualOptions(config: { metadata: Record<string, unknown> }) {
    const rawOptions = config.metadata.manualOptions;

    if (Array.isArray(rawOptions) && rawOptions.length > 0) {
      return rawOptions
        .filter(
          (option): option is Record<string, unknown> =>
            !!option && typeof option === 'object',
        )
        .map((option) => ({
          provider: 'manual',
          method: this.pickString(option.method) || 'Envio manual',
          price: Number(option.price ?? 0),
          estimatedDays: Math.max(Number(option.estimatedDays ?? 0), 0),
          carrierId: this.pickString(option.carrierId) || 'manual',
          carrierName: this.pickString(option.carrierName) || 'Envio manual',
          serviceCode: this.pickString(option.serviceCode) || undefined,
          modalityCode: this.pickString(option.modalityCode) || undefined,
          dispatchType: this.pickString(option.dispatchType) || undefined,
          branchId: this.pickString(option.branchId) || null,
        }));
    }

    const options: ShippingRate[] = [
      {
        provider: 'manual',
        method: 'Retiro en local',
        price: 0,
        estimatedDays: 0,
        carrierId: 'store',
        carrierName: 'Retiro en local',
        serviceCode: 'pickup',
        modalityCode: 'pickup',
        dispatchType: 'pickup',
      },
      {
        provider: 'manual',
        method: 'Envio a coordinar',
        price: 0,
        estimatedDays: 0,
        carrierId: 'manual',
        carrierName: 'Envio a coordinar',
        serviceCode: 'coordinar',
        modalityCode: 'manual',
        dispatchType: 'manual',
      },
    ];

    if (typeof config.metadata.fixedShippingPrice === 'number') {
      options.push({
        provider: 'manual',
        method: 'Envio fijo',
        price: Number(config.metadata.fixedShippingPrice),
        estimatedDays: Math.max(
          Number(config.metadata.fixedShippingDays ?? 0),
          0,
        ),
        carrierId: 'manual-fixed',
        carrierName: 'Envio fijo',
        serviceCode: 'fixed',
        modalityCode: 'manual',
        dispatchType: 'manual',
      });
    }

    if (config.metadata.freeShippingEnabled === true) {
      options.push({
        provider: 'manual',
        method: 'Envio gratis',
        price: 0,
        estimatedDays: Math.max(
          Number(config.metadata.freeShippingDays ?? 0),
          0,
        ),
        carrierId: 'manual-free',
        carrierName: 'Envio gratis',
        serviceCode: 'free',
        modalityCode: 'manual',
        dispatchType: 'manual',
      });
    }

    return options;
  }

  private pickString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }
}
