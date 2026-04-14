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
import { ShippingRate } from './providers/shipping-provider.interface';
import { ShippingPackageCalculatorService } from './services/shipping-package-calculator.service';

@Injectable()
export class ShippingService {
  constructor(
    private prisma: PrismaService,
    private providersRegistry: ShippingProvidersRegistryService,
    private quotesService: ShippingQuotesService,
    private providerConfigService: StoreShippingProviderConfigService,
    private packageCalculator: ShippingPackageCalculatorService,
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
            variant: {
              include: {
                product: true,
              },
            },
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

    let value = 0;

    for (const item of cart.items) {
      value += Number(item.variant.price) * item.quantity;
    }
    const resolvedProvider =
      await this.providerConfigService.resolveProviderForStore(storeId);
    const fallbackWeightKg = cart.items.reduce((sum, item) => {
      const variantWeightGrams = Number(item.variant.weightGrams ?? 0);
      const productWeightGrams = Number(item.variant.product?.weightGrams ?? 0);
      const legacyWeightKg = Number(item.variant.weight ?? 0);
      const resolvedWeightKg =
        variantWeightGrams > 0
          ? variantWeightGrams / 1000
          : productWeightGrams > 0
            ? productWeightGrams / 1000
            : legacyWeightKg > 0
              ? legacyWeightKg
              : 0;
      return sum + resolvedWeightKg * item.quantity;
    }, 0);
    const packageCalculation =
      resolvedProvider.provider.providerCode === 'manual'
        ? null
        : this.packageCalculator.calculateFromItems(
            cart.items,
            resolvedProvider.context.config,
          );
    const request = {
      postalCode,
      weight: packageCalculation?.weightKg ?? fallbackWeightKg,
      value,
      package: packageCalculation
        ? {
            weightGrams: packageCalculation.weightGrams,
            height: packageCalculation.package.height,
            width: packageCalculation.package.width,
            length: packageCalculation.package.length,
            summary:
              packageCalculation.summary as unknown as Record<string, unknown>,
          }
        : undefined,
      ...(destination ?? {}),
    };
    const manualProvider = this.providersRegistry.getProvider('manual');

    const pickupRates = (
      await manualProvider.getRates(request, {
        storeId,
        config: {
          provider: 'manual',
          source: 'env',
        },
      })
    ).map((rate) => ({
      ...rate,
      providerConfigId: null,
    }));

    let rates =
      resolvedProvider.provider.providerCode === 'manual'
        ? pickupRates
        : await resolvedProvider.provider.getRates(
            request,
            resolvedProvider.context,
          );

    rates = rates
      .map((rate) =>
        resolvedProvider.provider.providerCode === 'manual'
          ? rate
          : {
              ...rate,
              providerConfigId: resolvedProvider.config?.id ?? null,
              metadata: packageCalculation
                ? {
                    ...(rate.metadata ?? {}),
                    packageSummary: packageCalculation.summary,
                  }
                : rate.metadata,
            },
      )
      .filter((rate) => this.isSupportedCheckoutRate(rate));

    const mergedRates =
      resolvedProvider.provider.providerCode === 'manual'
        ? this.uniqueRates(rates)
        : this.uniqueRates([
            ...rates,
            ...pickupRates.filter((rate) => this.isPickupRate(rate)),
          ]);

    if (!mergedRates.length) {
      throw new BadRequestException(
        'No shipping options are currently available for this checkout',
      );
    }

    return this.quotesService.persistQuotes({
      storeId,
      cartId,
      customerId,
      postalCode,
      weight: packageCalculation?.weightKg ?? fallbackWeightKg,
      value,
      ...(destination ?? {}),
      providerConfigId: resolvedProvider.config?.id ?? null,
      rates: mergedRates,
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

  private isPickupRate(rate: ShippingRate) {
    const method = rate.method?.trim().toLowerCase() ?? '';
    const provider = rate.provider?.trim().toLowerCase() ?? '';
    const modality = rate.modalityCode?.trim().toLowerCase() ?? '';
    const dispatchType = rate.dispatchType?.trim().toLowerCase() ?? '';

    return (
      provider === 'store' ||
      method.includes('retiro') ||
      method.includes('pickup') ||
      modality === 'pickup' ||
      dispatchType === 'pickup'
    );
  }

  private isSupportedCheckoutRate(rate: ShippingRate) {
    const metadata =
      rate.metadata && typeof rate.metadata === 'object'
        ? (rate.metadata as Record<string, unknown>)
        : null;

    return metadata?.requiresBranchSelection !== true;
  }

  private uniqueRates(rates: ShippingRate[]) {
    const seen = new Set<string>();

    return rates.filter((rate) => {
      const key = [
        rate.provider,
        rate.method,
        rate.carrierId,
        rate.serviceCode,
        rate.modalityCode,
        rate.dispatchType,
        rate.branchId,
      ].join('|');

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }
}
