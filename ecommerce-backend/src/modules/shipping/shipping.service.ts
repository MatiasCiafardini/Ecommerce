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
}
