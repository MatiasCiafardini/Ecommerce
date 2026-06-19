import { BadRequestException, Injectable } from '@nestjs/common';
import { ResolvedShippingProviderConfig } from '../providers/shipping-provider.interface';

type LogisticsCarrierConfig = {
  defaultPackageDimensions?: {
    weightGrams?: number | null;
    height?: number | null;
    width?: number | null;
    length?: number | null;
  } | null;
  packagingMarginPercent?: number | null;
  minimumPackageDimensions?: {
    height?: number | null;
    width?: number | null;
    length?: number | null;
  } | null;
  maximumPackageDimensions?: {
    height?: number | null;
    width?: number | null;
    length?: number | null;
  } | null;
};

type PackageCalculationItem = {
  quantity: number;
  variant: {
    id?: number | null;
    sku?: string | null;
    weightGrams?: number | null;
    packageHeightCm?: number | null;
    packageWidthCm?: number | null;
    packageLengthCm?: number | null;
    weight?: number | null;
    height?: number | null;
    width?: number | null;
    length?: number | null;
    product?: {
      id?: number | null;
      title?: string | null;
      weightGrams?: number | null;
      packageHeightCm?: number | null;
      packageWidthCm?: number | null;
      packageLengthCm?: number | null;
    } | null;
  };
};

type ResolvedMetric = {
  value: number;
  source:
    | 'variant'
    | 'variant_legacy'
    | 'product'
    | 'store_fallback';
};

export type ShippingPackageCalculation = {
  weightGrams: number;
  weightKg: number;
  package: {
    height: number;
    width: number;
    length: number;
  };
  packagingMarginPercent: number;
  usedStoreFallbackForDimensions: boolean;
  usedLegacyVariantData: boolean;
  clampedToCarrierLimits: boolean;
  summary: {
    itemCount: number;
    totalUnits: number;
    weightGrams: number;
    weightKg: number;
    heightCm: number;
    widthCm: number;
    lengthCm: number;
    packagingMarginPercent: number;
    usedStoreFallbackForDimensions: boolean;
    usedLegacyVariantData: boolean;
    clampedToCarrierLimits: boolean;
  };
};

@Injectable()
export class ShippingPackageCalculatorService {
  calculateFromItems(
    items: PackageCalculationItem[],
    providerConfig?: ResolvedShippingProviderConfig | null,
  ): ShippingPackageCalculation {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException(
        'Cannot calculate shipping package for an empty cart',
      );
    }

    const carrierConfig = this.getCarrierConfig(providerConfig);
    const marginPercent = this.normalizeMarginPercent(
      carrierConfig.packagingMarginPercent,
    );
    const minimums = {
      height: this.normalizePositiveDimension(
        carrierConfig.minimumPackageDimensions?.height,
        1,
      ),
      width: this.normalizePositiveDimension(
        carrierConfig.minimumPackageDimensions?.width,
        1,
      ),
      length: this.normalizePositiveDimension(
        carrierConfig.minimumPackageDimensions?.length,
        1,
      ),
    };
    const maximums = {
      height: this.normalizePositiveDimension(
        carrierConfig.maximumPackageDimensions?.height,
        255,
      ),
      width: this.normalizePositiveDimension(
        carrierConfig.maximumPackageDimensions?.width,
        255,
      ),
      length: this.normalizePositiveDimension(
        carrierConfig.maximumPackageDimensions?.length,
        255,
      ),
    };

    let totalWeightGrams = 0;
    let stackedHeightCm = 0;
    let maxWidthCm = 0;
    let maxLengthCm = 0;
    let totalUnits = 0;
    let usedStoreFallbackForDimensions = false;
    let usedLegacyVariantData = false;

    for (const item of items) {
      const quantity = Math.max(1, Math.round(Number(item.quantity || 0)));
      const label = this.describeItem(item);
      const resolvedWeight = this.resolveWeightGrams(
        item,
        carrierConfig.defaultPackageDimensions?.weightGrams ?? null,
        label,
      );
      const resolvedHeight = this.resolveDimension(
        item,
        'height',
        carrierConfig.defaultPackageDimensions?.height ?? null,
        label,
      );
      const resolvedWidth = this.resolveDimension(
        item,
        'width',
        carrierConfig.defaultPackageDimensions?.width ?? null,
        label,
      );
      const resolvedLength = this.resolveDimension(
        item,
        'length',
        carrierConfig.defaultPackageDimensions?.length ?? null,
        label,
      );

      totalWeightGrams += resolvedWeight.value * quantity;
      stackedHeightCm += resolvedHeight.value * quantity;
      maxWidthCm = Math.max(maxWidthCm, resolvedWidth.value);
      maxLengthCm = Math.max(maxLengthCm, resolvedLength.value);
      totalUnits += quantity;

      if (
        resolvedHeight.source === 'store_fallback' ||
        resolvedWidth.source === 'store_fallback' ||
        resolvedLength.source === 'store_fallback'
      ) {
        usedStoreFallbackForDimensions = true;
      }

      if (
        resolvedWeight.source === 'variant_legacy' ||
        resolvedHeight.source === 'variant_legacy' ||
        resolvedWidth.source === 'variant_legacy' ||
        resolvedLength.source === 'variant_legacy'
      ) {
        usedLegacyVariantData = true;
      }
    }

    if (totalWeightGrams <= 0) {
      throw new BadRequestException(
        'Shipping quote requires real product weight. Add weightGrams to the variant or product before quoting.',
      );
    }

    const rawPackage = {
      height: stackedHeightCm,
      width: maxWidthCm,
      length: maxLengthCm,
    };
    const withMargin = {
      height: Math.ceil(rawPackage.height * (1 + marginPercent / 100)),
      width: Math.ceil(rawPackage.width * (1 + marginPercent / 100)),
      length: Math.ceil(rawPackage.length * (1 + marginPercent / 100)),
    };
    const normalizedPackage = {
      height: Math.max(withMargin.height, minimums.height),
      width: Math.max(withMargin.width, minimums.width),
      length: Math.max(withMargin.length, minimums.length),
    };
    const clampedPackage = {
      height: Math.min(normalizedPackage.height, maximums.height),
      width: Math.min(normalizedPackage.width, maximums.width),
      length: Math.min(normalizedPackage.length, maximums.length),
    };
    const clampedToCarrierLimits =
      clampedPackage.height !== normalizedPackage.height ||
      clampedPackage.width !== normalizedPackage.width ||
      clampedPackage.length !== normalizedPackage.length;

    return {
      weightGrams: Math.max(Math.round(totalWeightGrams), 1),
      weightKg: Number((Math.max(totalWeightGrams, 1) / 1000).toFixed(3)),
      package: clampedPackage,
      packagingMarginPercent: marginPercent,
      usedStoreFallbackForDimensions,
      usedLegacyVariantData,
      clampedToCarrierLimits,
      summary: {
        itemCount: items.length,
        totalUnits,
        weightGrams: Math.max(Math.round(totalWeightGrams), 1),
        weightKg: Number((Math.max(totalWeightGrams, 1) / 1000).toFixed(3)),
        heightCm: clampedPackage.height,
        widthCm: clampedPackage.width,
        lengthCm: clampedPackage.length,
        packagingMarginPercent: marginPercent,
        usedStoreFallbackForDimensions,
        usedLegacyVariantData,
        clampedToCarrierLimits,
      },
    };
  }

  private resolveWeightGrams(
    item: PackageCalculationItem,
    storeFallbackValue: number | null,
    label: string,
  ): ResolvedMetric {
    const variantWeightGrams = this.normalizePositiveNumber(
      item.variant?.weightGrams,
    );
    if (variantWeightGrams) {
      return { value: Math.round(variantWeightGrams), source: 'variant' };
    }

    const legacyVariantWeight = this.normalizePositiveNumber(item.variant?.weight);
    if (legacyVariantWeight) {
      return {
        value: Math.round(legacyVariantWeight * 1000),
        source: 'variant_legacy',
      };
    }

    const productWeightGrams = this.normalizePositiveNumber(
      item.variant?.product?.weightGrams,
    );
    if (productWeightGrams) {
      return { value: Math.round(productWeightGrams), source: 'product' };
    }

    const normalizedStoreFallback = this.normalizePositiveNumber(storeFallbackValue);
    if (normalizedStoreFallback) {
      return {
        value: Math.round(normalizedStoreFallback),
        source: 'store_fallback',
      };
    }

    throw new BadRequestException(
      `Shipping quote requires weight for ${label}. Add weightGrams to the variant or product, or configure defaultPackageDimensions.weightGrams as fallback in the store shipping provider.`,
    );
  }

  private resolveDimension(
    item: PackageCalculationItem,
    dimension: 'height' | 'width' | 'length',
    storeFallbackValue: number | null,
    label: string,
  ): ResolvedMetric {
    const variantField =
      dimension === 'height'
        ? item.variant?.packageHeightCm
        : dimension === 'width'
          ? item.variant?.packageWidthCm
          : item.variant?.packageLengthCm;
    const legacyVariantField =
      dimension === 'height'
        ? item.variant?.height
        : dimension === 'width'
          ? item.variant?.width
          : item.variant?.length;
    const productField =
      dimension === 'height'
        ? item.variant?.product?.packageHeightCm
        : dimension === 'width'
          ? item.variant?.product?.packageWidthCm
          : item.variant?.product?.packageLengthCm;

    const normalizedVariantField = this.normalizePositiveNumber(variantField);
    if (normalizedVariantField) {
      return { value: normalizedVariantField, source: 'variant' };
    }

    const normalizedLegacyField = this.normalizePositiveNumber(legacyVariantField);
    if (normalizedLegacyField) {
      return { value: normalizedLegacyField, source: 'variant_legacy' };
    }

    const normalizedProductField = this.normalizePositiveNumber(productField);
    if (normalizedProductField) {
      return { value: normalizedProductField, source: 'product' };
    }

    const normalizedStoreFallback = this.normalizePositiveNumber(storeFallbackValue);
    if (normalizedStoreFallback) {
      return { value: normalizedStoreFallback, source: 'store_fallback' };
    }

    throw new BadRequestException(
      `Shipping quote requires ${dimension} for ${label}. Add package${this.capitalize(dimension)}Cm to the variant or product, or configure defaultPackageDimensions as fallback in the store shipping provider.`,
    );
  }

  private getCarrierConfig(
    providerConfig?: ResolvedShippingProviderConfig | null,
  ): LogisticsCarrierConfig {
    const metadata =
      providerConfig?.metadata && typeof providerConfig.metadata === 'object'
        ? (providerConfig.metadata as Record<string, unknown>)
        : {};

    return {
      defaultPackageDimensions:
        metadata.defaultPackageDimensions &&
        typeof metadata.defaultPackageDimensions === 'object'
          ? (metadata.defaultPackageDimensions as LogisticsCarrierConfig['defaultPackageDimensions'])
          : null,
      packagingMarginPercent: this.normalizePositiveNumber(
        metadata.packagingMarginPercent,
      ),
      minimumPackageDimensions:
        metadata.minimumPackageDimensions &&
        typeof metadata.minimumPackageDimensions === 'object'
          ? (metadata.minimumPackageDimensions as LogisticsCarrierConfig['minimumPackageDimensions'])
          : null,
      maximumPackageDimensions:
        metadata.maximumPackageDimensions &&
        typeof metadata.maximumPackageDimensions === 'object'
          ? (metadata.maximumPackageDimensions as LogisticsCarrierConfig['maximumPackageDimensions'])
          : null,
    };
  }

  private normalizeMarginPercent(value?: number | null) {
    const safe = Number(value ?? 8);
    if (!Number.isFinite(safe) || safe < 0) {
      return 8;
    }

    return Math.min(safe, 100);
  }

  private normalizePositiveDimension(value?: number | null, fallback = 1) {
    const safe = Number(value ?? fallback);
    if (!Number.isFinite(safe) || safe <= 0) {
      return fallback;
    }

    return Math.max(Math.ceil(safe), fallback);
  }

  private normalizePositiveNumber(value: unknown) {
    const safe = Number(value ?? 0);
    if (!Number.isFinite(safe) || safe <= 0) {
      return null;
    }

    return safe;
  }

  private describeItem(item: PackageCalculationItem) {
    return (
      item.variant?.sku?.trim() ||
      item.variant?.product?.title?.trim() ||
      `variant-${item.variant?.id ?? 'unknown'}`
    );
  }

  private capitalize(value: string) {
    return value.slice(0, 1).toUpperCase() + value.slice(1);
  }
}
