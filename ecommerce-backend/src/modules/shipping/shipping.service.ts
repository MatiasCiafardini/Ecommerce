import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ShippingProvidersRegistryService } from './services/shipping-providers-registry.service';
import { ShippingQuotesService } from './services/shipping-quotes.service';
import { StoreShippingProviderConfigService } from './services/store-shipping-provider-config.service';
import {
  ShippingRate,
} from './providers/shipping-provider.interface';
import { ShippingPackageCalculatorService } from './services/shipping-package-calculator.service';
import { StoreShippingMethodsService } from './services/store-shipping-methods.service';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(
    private prisma: PrismaService,
    private providersRegistry: ShippingProvidersRegistryService,
    private quotesService: ShippingQuotesService,
    private providerConfigService: StoreShippingProviderConfigService,
    private packageCalculator: ShippingPackageCalculatorService,
    private storeShippingMethodsService: StoreShippingMethodsService,
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
      deliveryMode?: 'shipping' | 'pickup';
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
    const activeStoreMethods =
      await this.storeShippingMethodsService.findActive(storeId);
    const resolvedProvider =
      await this.providerConfigService.resolveProviderForCapability(
        storeId,
        'quote',
      );
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
      !resolvedProvider || resolvedProvider.provider.providerCode === 'manual'
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
    this.logger.log(
      `Checkout shipping quote provider=${resolvedProvider?.provider.providerCode ?? 'manual-store-methods'} capability=quote postalCode=${postalCode} weight=${request.weight} package=${JSON.stringify(
        request.package ?? null,
      )}`,
    );
    const manualProvider = this.providersRegistry.getProvider('manual');
    const manualStoreRates = this.buildStoreMethodRates(
      activeStoreMethods,
      value,
      destination?.deliveryMode,
    );

    const pickupRates = (
      await manualProvider.getRates(request, {
        storeId,
        config: {
          provider: 'manual',
          source: 'env',
        },
      })
    )
      .filter((rate) =>
        destination?.deliveryMode === 'shipping'
          ? !this.isPickupRate(rate)
          : true,
      )
      .map((rate) => ({
        ...rate,
        providerConfigId: null,
      }));
    const usesExternalShippingQuote =
      destination?.deliveryMode === 'shipping' &&
      resolvedProvider?.provider.providerCode !== 'manual';
    const manualRates = usesExternalShippingQuote
      ? []
      : manualStoreRates.length
        ? manualStoreRates
        : pickupRates;
    const eligibleFreeShippingRates = pickupRates.filter((rate) =>
      this.isFreeShippingRate(rate),
    );

    if (destination?.deliveryMode !== 'shipping' && eligibleFreeShippingRates.length > 0) {
      return this.quotesService.persistQuotes({
        storeId,
        cartId,
        customerId,
        postalCode,
        weight: packageCalculation?.weightKg ?? fallbackWeightKg,
        value,
        ...(destination ?? {}),
        providerConfigId: null,
        rates: this.uniqueRates(eligibleFreeShippingRates),
      });
    }

    const providerRates =
      !resolvedProvider || resolvedProvider.provider.providerCode === 'manual'
        ? []
        : await resolvedProvider.provider.getRates(
            request,
            resolvedProvider.context,
          );

    const rates = providerRates
      .map((rate) =>
        ({
          ...rate,
          estimatedDays: this.resolveEstimatedDaysOverride(
            rate.estimatedDays,
            activeStoreMethods,
          ),
          providerConfigId: resolvedProvider?.config?.id ?? null,
          metadata: packageCalculation
            ? {
                ...(rate.metadata ?? {}),
                packageSummary: packageCalculation.summary,
              }
            : rate.metadata,
        }),
      )
      .filter((rate) => this.isSupportedCheckoutRate(rate));

    const mergedRates =
      !resolvedProvider || resolvedProvider.provider.providerCode === 'manual'
        ? this.uniqueRates(manualRates)
        : this.uniqueRates([...rates, ...manualRates]);

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
      providerConfigId: resolvedProvider?.config?.id ?? null,
      rates: mergedRates,
    });
  }

  async getStoreMethods(storeId: number) {
    const methods = await this.storeShippingMethodsService.findActive(storeId);
    return methods.length ? methods : this.storeShippingMethodsService.defaultMethods(storeId);
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
      await this.providerConfigService.resolveProviderForCapability(
        storeId,
        'quote',
        {
        providerCode: input.provider,
        },
      );

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

  private isSupportedCheckoutRate(rate: ShippingRate) {
    const metadata =
      rate.metadata && typeof rate.metadata === 'object'
        ? (rate.metadata as Record<string, unknown>)
        : null;

    return metadata?.requiresBranchSelection !== true;
  }

  private buildStoreMethodRates(
    methods: Awaited<ReturnType<StoreShippingMethodsService['findActive']>>,
    subtotal: number,
    deliveryMode?: 'shipping' | 'pickup',
  ) {
    const activeMethods = methods.length
      ? methods
      : this.storeShippingMethodsService.defaultMethods(0);

    return activeMethods
      .filter((method) => {
        if (deliveryMode === 'pickup') {
          return method.type === 'pickup';
        }

        if (deliveryMode === 'shipping') {
          return method.type !== 'pickup' && method.type !== 'integration';
        }

        return method.type !== 'integration';
      })
      .filter((method) => {
        if (method.type !== 'free') {
          return true;
        }

        return (
          !method.freeShippingMinimumAmount ||
          subtotal >= method.freeShippingMinimumAmount
        );
      })
      .map((method) => ({
        provider: method.type === 'pickup' ? 'store' : 'manual',
        method: method.name,
        price: method.type === 'manual' ? method.price : 0,
        estimatedDays: method.estimatedDays ?? (method.type === 'pickup' ? 0 : 3),
        carrierId: method.type === 'pickup' ? 'store' : 'manual',
        carrierName: method.name,
        serviceCode: method.type,
        modalityCode: method.type === 'pickup' ? 'pickup' : 'manual',
        dispatchType: method.type,
        providerConfigId: null,
        metadata: {
          storeShippingMethodId: method.id,
          pickupAddress: method.pickupAddress,
          pickupHours: method.pickupHours,
          pickupInstructions: method.pickupInstructions,
        },
      }));
  }

  private isFreeShippingRate(rate: ShippingRate) {
    const method = rate.method?.trim().toLowerCase() ?? '';
    const serviceCode = rate.serviceCode?.trim().toLowerCase() ?? '';
    const dispatchType = rate.dispatchType?.trim().toLowerCase() ?? '';
    const methodType = rate.methodType?.trim().toLowerCase() ?? '';

    return (
      Number(rate.price ?? 0) === 0 &&
      (methodType === 'free' ||
        serviceCode === 'free' ||
        dispatchType === 'free' ||
        method.includes('gratis'))
    );
  }

  private isPickupRate(rate: ShippingRate) {
    return (
      rate.provider === 'store' ||
      rate.carrierId === 'store' ||
      rate.serviceCode === 'pickup' ||
      rate.modalityCode === 'pickup' ||
      rate.method?.toLowerCase().includes('retiro') ||
      rate.method?.toLowerCase().includes('pickup')
    );
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

  private resolveEstimatedDaysOverride(
    providerEstimatedDays: number,
    activeStoreMethods: Array<{
      type: string;
      estimatedDays?: number | null;
    }>,
  ) {
    const integrationMethod = activeStoreMethods.find(
      (method) =>
        method.type === 'integration' &&
        method.estimatedDays !== null &&
        method.estimatedDays !== undefined,
    );

    return integrationMethod?.estimatedDays ?? providerEstimatedDays;
  }
}
