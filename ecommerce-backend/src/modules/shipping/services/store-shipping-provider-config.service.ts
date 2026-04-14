import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import {
  ResolvedShippingProviderConfig,
  ShippingProvider,
  ShippingProviderContext,
} from '../providers/shipping-provider.interface';
import { ShippingProvidersRegistryService } from './shipping-providers-registry.service';

type ProviderConfigRecord = Prisma.StoreShippingProviderConfigGetPayload<object>;

@Injectable()
export class StoreShippingProviderConfigService {
  constructor(
    private prisma: PrismaService,
    private registry: ShippingProvidersRegistryService,
  ) {}

  async findAll(storeId: number) {
    return this.prisma.storeShippingProviderConfig.findMany({
      where: { storeId },
      orderBy: [
        { isDefault: 'desc' },
        { provider: 'asc' },
      ],
    });
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

    return config;
  }

  async createOrUpdate(
    storeId: number,
    input: {
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
    },
  ) {
    const provider = input.provider.trim().toLowerCase();
    this.registry.getProvider(provider);

    return this.prisma.$transaction(async (tx) => {
      if (input.isDefault) {
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
          enabled: input.enabled ?? true,
          isDefault: input.isDefault ?? false,
          mode: input.mode?.trim() || 'DEFAULT',
          email: input.email ?? null,
          password: input.password ?? null,
          agreement: input.agreement ?? null,
          apiKey: input.apiKey ?? null,
          secretKey: input.secretKey ?? null,
          originBranch: input.originBranch ?? null,
          originAddressId: input.originAddressId ?? null,
          senderName: input.senderName ?? null,
          senderPhone: input.senderPhone ?? null,
          senderEmail: input.senderEmail ?? null,
          companyName: input.companyName ?? null,
          metadata: input.metadata ?? Prisma.JsonNull,
        },
        update: {
          enabled: input.enabled ?? undefined,
          isDefault: input.isDefault ?? undefined,
          mode: input.mode === undefined ? undefined : input.mode?.trim() || 'DEFAULT',
          email: input.email === undefined ? undefined : input.email,
          password: input.password === undefined ? undefined : input.password,
          agreement: input.agreement === undefined ? undefined : input.agreement,
          apiKey: input.apiKey === undefined ? undefined : input.apiKey,
          secretKey: input.secretKey === undefined ? undefined : input.secretKey,
          originBranch:
            input.originBranch === undefined ? undefined : input.originBranch,
          originAddressId:
            input.originAddressId === undefined
              ? undefined
              : input.originAddressId,
          senderName: input.senderName === undefined ? undefined : input.senderName,
          senderPhone:
            input.senderPhone === undefined ? undefined : input.senderPhone,
          senderEmail:
            input.senderEmail === undefined ? undefined : input.senderEmail,
          companyName:
            input.companyName === undefined ? undefined : input.companyName,
          metadata:
            input.metadata === undefined
              ? undefined
              : input.metadata === null
                ? Prisma.JsonNull
                : input.metadata,
        },
      });
    });
  }

  async updateById(
    storeId: number,
    id: string,
    input: {
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
    },
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

    if (configRecord) {
      const provider = this.registry.getProvider(configRecord.provider);

      return {
        provider,
        providerCode: provider.providerCode,
        config: this.mapConfig(configRecord),
        context: {
          storeId,
          config: this.mapConfig(configRecord),
        },
        source: 'store',
      };
    }

    const fallbackCode =
      (requestedProviderIsRegistered ? providerCode : null) ||
      this.getGlobalFallbackProviderCode();
    const provider = this.registry.getProvider(fallbackCode);

    return {
      provider,
      providerCode: provider.providerCode,
      config: requestedProviderIsRegistered
        ? {
            provider: provider.providerCode,
            source: 'env',
          }
        : null,
      context: {
        storeId,
        config: requestedProviderIsRegistered
          ? {
              provider: provider.providerCode,
              source: 'env',
            }
          : null,
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

    const resolvedProvider = await this.resolveProviderForStore(storeId, {
      providerConfigId: id,
    });

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
}
