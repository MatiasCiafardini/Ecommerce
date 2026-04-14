import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ShippingProvidersRegistryService } from './services/shipping-providers-registry.service';
import { ShippingQuotesService } from './services/shipping-quotes.service';
import { StoreShippingProviderConfigService } from './services/store-shipping-provider-config.service';

@Injectable()
export class ShippingService {
  constructor(
    private prisma: PrismaService,
    private providersRegistry: ShippingProvidersRegistryService,
    private quotesService: ShippingQuotesService,
    private providerConfigService: StoreShippingProviderConfigService,
  ) {}

  async getOptions(
    storeId: number,
    cartId: number,
    customerId: number,
    postalCode: string,
    destination?: {
      state?: string;
      city?: string;
      country?: string;
    },
  ) {
    const cart = await this.prisma.cart.findFirst({
      where: {
        id: cartId,
        storeId,
      },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    if (cart.customerId !== customerId) {
      throw new ForbiddenException('Cart does not belong to this customer');
    }

    if (!cart.items.length) {
      throw new BadRequestException('Cart is empty');
    }

    let weight = 0;
    let value = 0;

    for (const item of cart.items) {
      weight += (item.variant.weight ?? 0) * item.quantity;
      value += Number(item.variant.price) * item.quantity;
    }

    const request = {
      postalCode,
      weight,
      value,
      ...(destination ?? {}),
    };
    const resolvedProvider =
      await this.providerConfigService.resolveProviderForStore(storeId);
    let rates;

    try {
      rates = await resolvedProvider.provider.getRates(
        request,
        resolvedProvider.context,
      );
    } catch (error) {
      if (resolvedProvider.provider.providerCode === 'manual') {
        throw error;
      }

      const manualProvider = this.providersRegistry.getProvider('manual');
      rates = await manualProvider.getRates(request, {
        storeId,
        config: {
          provider: 'manual',
          source: 'env',
        },
      });
    }

    return this.quotesService.persistQuotes({
      storeId,
      cartId,
      customerId,
      postalCode,
      weight,
      value,
      ...(destination ?? {}),
      providerConfigId: resolvedProvider.config?.id ?? null,
      rates,
    });
  }

  async getAgencies(
    storeId: number,
    customerId: number,
    input: {
      provider?: string;
      provinceCode?: string;
      state?: string;
      postalCode?: string;
      city?: string;
      service?: string;
    },
  ) {
    await this.ensureCustomer(storeId, customerId);

    const resolvedProvider =
      await this.providerConfigService.resolveProviderForStore(storeId, {
        providerCode: input.provider,
      });

    if (!resolvedProvider.provider.getAgencies) {
      throw new BadRequestException(
        `Shipping provider ${resolvedProvider.provider.providerCode} does not support branch lookup`,
      );
    }

    return resolvedProvider.provider.getAgencies(
      {
        provinceCode: input.provinceCode,
        state: input.state,
        postalCode: input.postalCode,
        city: input.city,
        service: input.service,
      },
      resolvedProvider.context,
    );
  }

  private async ensureCustomer(storeId: number, customerId: number) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        storeId,
      },
      select: {
        id: true,
      },
    });

    if (!customer) {
      throw new ForbiddenException('Customer does not belong to this store');
    }

    return customer;
  }
}
