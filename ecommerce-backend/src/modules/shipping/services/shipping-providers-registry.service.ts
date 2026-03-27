import { Injectable, NotFoundException } from '@nestjs/common';

import { CorreoArgentinoProvider } from '../providers/correo-argentino.provider';
import { EnvioPackProvider } from '../providers/enviopack.provider';
import { ManualShippingProvider } from '../providers/manual.provider';
import { MockShippingProvider } from '../providers/mock.provider';
import type { ShippingProvider } from '../providers/shipping-provider.interface';

@Injectable()
export class ShippingProvidersRegistryService {
  private readonly providers: ShippingProvider[];

  constructor(
    manualProvider: ManualShippingProvider,
    mockProvider: MockShippingProvider,
    envioPackProvider: EnvioPackProvider,
    correoArgentinoProvider: CorreoArgentinoProvider,
  ) {
    this.providers = [
      manualProvider,
      mockProvider,
      envioPackProvider,
      correoArgentinoProvider,
    ];
  }

  getProvider(providerCode: string) {
    const normalized = providerCode?.trim().toLowerCase();
    const provider = this.providers.find(
      (candidate) => candidate.providerCode === normalized,
    );

    if (!provider) {
      throw new NotFoundException(
        `Shipping provider ${providerCode} is not registered`,
      );
    }

    return provider;
  }

  hasProvider(providerCode: string) {
    const normalized = providerCode?.trim().toLowerCase();

    return this.providers.some(
      (candidate) => candidate.providerCode === normalized,
    );
  }

  listProviders() {
    return this.providers.map((provider) => provider.providerCode);
  }
}
