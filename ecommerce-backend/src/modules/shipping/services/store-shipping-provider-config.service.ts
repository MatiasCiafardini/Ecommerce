import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import {
  ResolvedShippingProviderConfig,
  ShippingProviderCapability,
  ShippingProvider,
  ShippingProviderContext,
} from '../providers/shipping-provider.interface';
import { ShippingProvidersRegistryService } from './shipping-providers-registry.service';

type ProviderConfigRecord = Prisma.StoreShippingProviderConfigGetPayload<object>;
type ProviderConfigInput = {
  provider: string;
  enabled?: boolean;
  isDefault?: boolean;
  mode?: string | null;
  email?: string | null;
  password?: string | null;
  agreement?: string | null;
  apiKey?: string | null;
  secretKey?: string | null;
  originBranch?: string | null;
  originAddressId?: string | null;
  senderName?: string | null;
  senderPhone?: string | null;
  senderEmail?: string | null;
  companyName?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

@Injectable()
export class StoreShippingProviderConfigService {
  private readonly logger = new Logger(StoreShippingProviderConfigService.name);

  constructor(
    private prisma: PrismaService,
    private registry: ShippingProvidersRegistryService,
  ) {}

  async findAll(storeId: number) {
    const configs = await this.prisma.storeShippingProviderConfig.findMany({
      where: { storeId },
      orderBy: [
        { isDefault: 'desc' },
        { provider: 'asc' },
      ],
    });

    return configs.map((config) => this.sanitizeRecordForOutput(config));
  }

  async findOne(storeId: number, id: string) {
    const config = await this.prisma.storeShippingProviderConfig.findFirst({
      where: {
        id,
        storeId,
      },
    });

    if (!config) {
      throw new NotFoundException('Shipping provider config not found');
    }

    return this.sanitizeRecordForOutput(config);
  }

  async createOrUpdate(
    storeId: number,
    input: ProviderConfigInput,
  ) {
    const provider = input.provider.trim().toLowerCase();
    this.registry.getProvider(provider);
    const sanitizedInput = this.sanitizeInputForProvider(provider, input);

    return this.prisma.$transaction(async (tx) => {
      if (sanitizedInput.isDefault) {
        await tx.storeShippingProviderConfig.updateMany({
          where: { storeId },
          data: { isDefault: false },
        });
      }

      return tx.storeShippingProviderConfig.upsert({
        where: {
          storeId_provider: {
            storeId,
            provider,
          },
        },
        create: {
          storeId,
          provider,
          enabled: sanitizedInput.enabled ?? true,
          isDefault: sanitizedInput.isDefault ?? false,
          mode: sanitizedInput.mode?.trim() || 'DEFAULT',
          email: sanitizedInput.email ?? null,
          password: sanitizedInput.password ?? null,
          agreement: sanitizedInput.agreement ?? null,
          apiKey: sanitizedInput.apiKey ?? null,
          secretKey: sanitizedInput.secretKey ?? null,
          originBranch: sanitizedInput.originBranch ?? null,
          originAddressId: sanitizedInput.originAddressId ?? null,
          senderName: sanitizedInput.senderName ?? null,
          senderPhone: sanitizedInput.senderPhone ?? null,
          senderEmail: sanitizedInput.senderEmail ?? null,
          companyName: sanitizedInput.companyName ?? null,
          metadata: sanitizedInput.metadata ?? Prisma.JsonNull,
        },
        update: {
          enabled: sanitizedInput.enabled ?? undefined,
          isDefault: sanitizedInput.isDefault ?? undefined,
          mode:
            sanitizedInput.mode === undefined
              ? undefined
              : sanitizedInput.mode?.trim() || 'DEFAULT',
          email:
            sanitizedInput.email === undefined ? undefined : sanitizedInput.email,
          password:
            sanitizedInput.password === undefined
              ? undefined
              : sanitizedInput.password,
          agreement:
            sanitizedInput.agreement === undefined
              ? undefined
              : sanitizedInput.agreement,
          apiKey:
            sanitizedInput.apiKey === undefined ? undefined : sanitizedInput.apiKey,
          secretKey:
            sanitizedInput.secretKey === undefined
              ? undefined
              : sanitizedInput.secretKey,
          originBranch:
            sanitizedInput.originBranch === undefined
              ? undefined
              : sanitizedInput.originBranch,
          originAddressId:
            sanitizedInput.originAddressId === undefined
              ? undefined
              : sanitizedInput.originAddressId,
          senderName:
            sanitizedInput.senderName === undefined
              ? undefined
              : sanitizedInput.senderName,
          senderPhone:
            sanitizedInput.senderPhone === undefined
              ? undefined
              : sanitizedInput.senderPhone,
          senderEmail:
            sanitizedInput.senderEmail === undefined
              ? undefined
              : sanitizedInput.senderEmail,
          companyName:
            sanitizedInput.companyName === undefined
              ? undefined
              : sanitizedInput.companyName,
          metadata:
            sanitizedInput.metadata === undefined
              ? undefined
              : sanitizedInput.metadata === null
                ? Prisma.JsonNull
                : sanitizedInput.metadata,
        },
      });
    });
  }

  async updateById(
    storeId: number,
    id: string,
    input: Omit<ProviderConfigInput, 'provider'>,
  ) {
    const current = await this.findOne(storeId, id);

    return this.createOrUpdate(storeId, {
      provider: current.provider,
      enabled: input.enabled,
      isDefault: input.isDefault,
      mode: input.mode,
      email: input.email,
      password: input.password,
      agreement: input.agreement,
      apiKey: input.apiKey,
      secretKey: input.secretKey,
      originBranch: input.originBranch,
      originAddressId: input.originAddressId,
      senderName: input.senderName,
      senderPhone: input.senderPhone,
      senderEmail: input.senderEmail,
      companyName: input.companyName,
      metadata: input.metadata,
    });
  }

  async setEnabled(storeId: number, id: string, enabled: boolean) {
    await this.findOne(storeId, id);

    const updated = await this.prisma.storeShippingProviderConfig.update({
      where: { id },
      data: { enabled },
    });

    if (!enabled && updated.isDefault) {
      await this.prisma.storeShippingProviderConfig.update({
        where: { id },
        data: { isDefault: false },
      });
    }

    return this.findOne(storeId, id);
  }

  async setDefault(storeId: number, id: string) {
    const target = await this.findOne(storeId, id);

    if (!target.enabled) {
      throw new BadRequestException(
        'Cannot set a disabled shipping provider config as default',
      );
    }

    await this.prisma.$transaction([
      this.prisma.storeShippingProviderConfig.updateMany({
        where: { storeId },
        data: { isDefault: false },
      }),
      this.prisma.storeShippingProviderConfig.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    return this.findOne(storeId, id);
  }

  async resolveProviderForStore(
    storeId: number,
    options?: {
      providerCode?: string | null;
      providerConfigId?: string | null;
    },
  ): Promise<{
    provider: ShippingProvider;
    providerCode: string;
    config: ResolvedShippingProviderConfig | null;
    context: ShippingProviderContext;
      source: 'store' | 'env';
  }> {
    return this.resolveProviderForCapability(storeId, 'quote', options);
  }

  async resolveProviderForCapability(
    storeId: number,
    capability: ShippingProviderCapability,
    options?: {
      providerCode?: string | null;
      providerConfigId?: string | null;
    },
  ): Promise<{
    provider: ShippingProvider;
    providerCode: string;
    config: ResolvedShippingProviderConfig | null;
    context: ShippingProviderContext;
    source: 'store' | 'env';
  }> {
    const providerCode = options?.providerCode?.trim().toLowerCase() || null;
    const requestedProviderIsRegistered = providerCode
      ? this.registry.hasProvider(providerCode)
      : false;
    const providerConfigId = options?.providerConfigId?.trim() || null;

    let configRecord: ProviderConfigRecord | null = null;

    if (providerConfigId) {
      configRecord = await this.prisma.storeShippingProviderConfig.findFirst({
        where: {
          id: providerConfigId,
          storeId,
        },
      });
    }

    if (!configRecord && providerCode && requestedProviderIsRegistered) {
      configRecord = await this.prisma.storeShippingProviderConfig.findFirst({
        where: {
          storeId,
          provider: providerCode,
          enabled: true,
        },
      });
    }

    if (!configRecord) {
      configRecord = await this.prisma.storeShippingProviderConfig.findFirst({
        where: {
          storeId,
          enabled: true,
          isDefault: true,
        },
      });
    }

    if (
      !providerCode &&
      !providerConfigId &&
      (!configRecord || configRecord.provider === 'manual')
    ) {
      const automaticConfig =
        await this.findPreferredAutomaticConfigRecord(storeId);

      if (automaticConfig) {
        configRecord = automaticConfig;
      }
    }

    if (configRecord) {
      const provider = this.registry.getProvider(configRecord.provider);
      const normalizedConfig = this.normalizeConfigForCapability(
        capability,
        this.mapConfig(configRecord),
      );

      this.logger.log(
        `Resolved shipping provider capability=${capability} provider=${provider.providerCode} source=store mode=${normalizedConfig?.mode ?? 'DEFAULT'}`,
      );

      return {
        provider,
        providerCode: provider.providerCode,
        config: normalizedConfig,
        context: {
          storeId,
          config: normalizedConfig,
        },
        source: 'store',
      };
    }

    const fallbackCode =
      (requestedProviderIsRegistered ? providerCode : null) ||
      this.getGlobalFallbackProviderCode();
    const provider = this.registry.getProvider(fallbackCode);
    const envConfig = requestedProviderIsRegistered
      ? this.normalizeConfigForCapability(capability, {
          provider: provider.providerCode,
          source: 'env',
        })
      : null;

    this.logger.log(
      `Resolved shipping provider capability=${capability} provider=${provider.providerCode} source=env mode=${envConfig?.mode ?? 'DEFAULT'}`,
    );

    return {
      provider,
      providerCode: provider.providerCode,
      config: envConfig,
      context: {
        storeId,
        config: envConfig,
      },
      source: 'env',
    };
  }

  async testConnection(
    storeId: number,
    id: string,
  ): Promise<{ ok: boolean; message: string; details?: unknown }> {
    const config = await this.findOne(storeId, id);
    const provider = this.registry.getProvider(config.provider);

    if (!provider.testConnection) {
      return {
        ok: true,
        message: `Provider ${config.provider} does not expose an explicit testConnection hook`,
      };
    }

    return provider.testConnection({
      storeId,
      config: this.mapConfig(config),
    });
  }

  async getAgencies(
    storeId: number,
    id: string,
    input: {
      provinceCode?: string | null;
      state?: string | null;
      postalCode?: string | null;
      city?: string | null;
      service?: string | null;
    },
  ) {
    await this.findOne(storeId, id);

    const resolvedProvider = await this.resolveProviderForCapability(
      storeId,
      'quote',
      {
        providerConfigId: id,
      },
    );

    if (!resolvedProvider.provider.getAgencies) {
      throw new BadRequestException(
        `Provider ${resolvedProvider.provider.providerCode} does not support branch lookup`,
      );
    }

    return resolvedProvider.provider.getAgencies(input, resolvedProvider.context);
  }

  private mapConfig(
    config: ProviderConfigRecord,
  ): ResolvedShippingProviderConfig {
    return {
      id: config.id,
      storeId: config.storeId,
      provider: config.provider,
      enabled: config.enabled,
      isDefault: config.isDefault,
      mode: config.mode,
      email: config.email,
      password: config.password,
      agreement: config.agreement,
      apiKey: config.apiKey,
      secretKey: config.secretKey,
      originBranch: config.originBranch,
      originAddressId: config.originAddressId,
      senderName: config.senderName,
      senderPhone: config.senderPhone,
      senderEmail: config.senderEmail,
      companyName: config.companyName,
      metadata:
        config.metadata && typeof config.metadata === 'object'
          ? (config.metadata as Record<string, unknown>)
          : null,
      source: 'store',
    };
  }

  private getGlobalFallbackProviderCode() {
    if (
      process.env.ALLOW_GLOBAL_EXTERNAL_SHIPPING?.trim().toLowerCase() ===
      'true'
    ) {
      const configuredExternalProvider =
        process.env.SHIPPING_PROVIDER?.trim().toLowerCase() ||
        (process.env.ENVIOPACK_API_KEY ? 'enviopack' : 'manual');

      return configuredExternalProvider;
    }

    return 'manual';
  }

  private async findPreferredAutomaticConfigRecord(storeId: number) {
    const configs = await this.prisma.storeShippingProviderConfig.findMany({
      where: {
        storeId,
        enabled: true,
        provider: {
          not: 'manual',
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { provider: 'asc' },
      ],
    });

    if (!configs.length) {
      return null;
    }

    const preferredOrder = ['correo-argentino', 'enviopack', 'mock'];

    return (
      configs.sort((left, right) => {
        const leftIndex = preferredOrder.indexOf(left.provider);
        const rightIndex = preferredOrder.indexOf(right.provider);
        const leftRank = leftIndex === -1 ? preferredOrder.length : leftIndex;
        const rightRank = rightIndex === -1 ? preferredOrder.length : rightIndex;

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        if (left.isDefault !== right.isDefault) {
          return left.isDefault ? -1 : 1;
        }

        return left.provider.localeCompare(right.provider);
      })[0] ?? null
    );
  }

  private sanitizeInputForProvider(
    provider: string,
    input: ProviderConfigInput,
  ): ProviderConfigInput {
    return input;
  }

  private sanitizeRecordForOutput(record: ProviderConfigRecord) {
    return record;
  }

  private normalizeConfigForCapability(
    capability: ShippingProviderCapability,
    config: ResolvedShippingProviderConfig | null,
  ) {
    if (!config || config.provider !== 'correo-argentino') {
      return config;
    }

    if (capability === 'label') {
      return {
        ...config,
        mode:
          this.pickMode(config.mode) ||
          (this.hasPaqArLabelConfig(config) ? 'PAQAR_API' : 'MICORREO'),
      };
    }

    const normalized = {
      ...config,
      mode: 'MICORREO',
    } satisfies ResolvedShippingProviderConfig;

    if (!this.hasMiCorreoConfig(normalized)) {
      throw new BadRequestException(
        'MiCorreo no esta configurado para esta tienda',
      );
    }

    return normalized;
  }

  private hasMiCorreoConfig(config: ResolvedShippingProviderConfig) {
    const metadata =
      config.metadata && typeof config.metadata === 'object'
        ? (config.metadata as Record<string, unknown>)
        : {};

    const apiUsername =
      this.pickString(metadata.apiUsername) ||
      process.env.CORREO_ARGENTINO_API_USERNAME?.trim() ||
      '';
    const apiPassword =
      this.pickString(metadata.apiPassword) ||
      process.env.CORREO_ARGENTINO_API_PASSWORD?.trim() ||
      '';
    const customerId =
      this.pickString(metadata.customerId) ||
      process.env.CORREO_ARGENTINO_CUSTOMER_ID?.trim() ||
      '';
    const customerEmail =
      this.pickString(config.email) ||
      this.pickString(metadata.customerEmail) ||
      this.pickString(metadata.email) ||
      process.env.CORREO_ARGENTINO_EMAIL?.trim() ||
      '';
    const customerPassword =
      this.pickString(config.password) ||
      this.pickString(metadata.customerPassword) ||
      this.pickString(metadata.password) ||
      process.env.CORREO_ARGENTINO_PASSWORD?.trim() ||
      '';
    const originAddress =
      metadata.originAddress && typeof metadata.originAddress === 'object'
        ? (metadata.originAddress as Record<string, unknown>)
        : {};
    const originPostalCode = this.pickString(originAddress.postalCode);

    return Boolean(
      apiUsername &&
        apiPassword &&
        originPostalCode &&
        (customerId || (customerEmail && customerPassword)),
    );
  }

  private hasPaqArLabelConfig(config: ResolvedShippingProviderConfig) {
    const metadata =
      config.metadata && typeof config.metadata === 'object'
        ? (config.metadata as Record<string, unknown>)
        : {};
    const paqAr =
      metadata.paqAr && typeof metadata.paqAr === 'object'
        ? (metadata.paqAr as Record<string, unknown>)
        : {};

    const apiBaseUrl =
      this.pickString(paqAr.apiBaseUrl) ||
      process.env.CORREO_ARGENTINO_PAQAR_API_BASE_URL?.trim() ||
      '';
    const agreement =
      this.pickString(config.agreement) ||
      this.pickString(paqAr.agreement) ||
      process.env.CORREO_ARGENTINO_PAQAR_AGREEMENT?.trim() ||
      process.env.CORREO_ARGENTINO_AGREEMENT?.trim() ||
      '';
    const apiKey =
      this.pickString(config.apiKey) ||
      this.pickString(paqAr.apiKey) ||
      process.env.CORREO_ARGENTINO_PAQAR_API_KEY?.trim() ||
      process.env.CORREO_ARGENTINO_API_KEY?.trim() ||
      '';

    return Boolean(apiBaseUrl && agreement && apiKey);
  }

  private pickMode(value?: string | null) {
    const normalized = this.pickString(value).toUpperCase();
    if (normalized === 'MICORREO' || normalized === 'PAQAR_API') {
      return normalized;
    }
    return '';
  }

  private pickString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }
}
