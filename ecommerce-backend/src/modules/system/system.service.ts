import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSystemStoreDto } from './dto/create-system-store.dto';
import { UpdateSystemStoreDto } from './dto/update-system-store.dto';

type StorefrontSection = Record<string, unknown>;
type StorefrontConfigShape = {
  theme?: string;
  branding?: {
    tagline?: string;
    description?: string;
    logoUrl?: string;
  };
  contact?: {
    supportEmail?: string;
    supportPhone?: string;
  };
  themePalette?: Record<string, string>;
  pages: {
    home: Array<{
      type: string;
      props?: Record<string, unknown>;
    }>;
  };
};

const defaultPalette = {
  background: '#06131a',
  backgroundSoft: '#0d1f29',
  backgroundElevated: '#112936',
  paper: '#e8f3f7',
  paperMuted: '#a6c3d1',
  text: '#dfeaf0',
  textMuted: '#9cb2bf',
  textStrong: '#f7fbfc',
  border: '#274453',
  borderStrong: '#386075',
  accent: '#53b7c7',
  accentStrong: '#2f90a5',
  accentContrast: '#041014',
  storeShellBg: '#06131a',
  pagePanelBg: '#0d1f29',
  pagePanelStrongBg: '#112936',
  blockCardBg: '#102532',
  newsletterShellBg: '#173543',
  accountShellBg: '#06131a',
  accountSidebarBg: '#0d1f29',
  accountItemBg: '#0f2430',
  accountItemBgActive: '#173543',
  accountItemBorder: '#274453',
} satisfies Record<string, string>;

function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//i, '')
    .split('/')[0]
    .replace(/\.$/, '');
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function sanitizeOptionalString(value?: string | null) {
  if (!isNonEmptyString(value)) {
    return null;
  }

  return value.trim();
}

function toStorefrontConfig(input: unknown): StorefrontConfigShape {
  const source =
    input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const theme = isNonEmptyString(source.theme) ? source.theme.trim() : undefined;
  const branding =
    source.branding && typeof source.branding === 'object'
      ? (source.branding as StorefrontSection)
      : {};
  const contact =
    source.contact && typeof source.contact === 'object'
      ? (source.contact as StorefrontSection)
      : {};
  const themePalette =
    source.themePalette && typeof source.themePalette === 'object'
      ? (Object.fromEntries(
          Object.entries(source.themePalette as Record<string, unknown>).filter(
            ([, value]) => isNonEmptyString(value),
          ),
        ) as Record<string, string>)
      : {};
  const rawPages =
    source.pages && typeof source.pages === 'object'
      ? (source.pages as Record<string, unknown>)
      : {};
  const rawHome = Array.isArray(rawPages.home) ? rawPages.home : [];

  return {
    ...(theme ? { theme } : {}),
    ...(Object.keys(branding).length > 0
      ? {
          branding: {
            ...(isNonEmptyString(branding.tagline) ? { tagline: branding.tagline.trim() } : {}),
            ...(isNonEmptyString(branding.description)
              ? { description: branding.description.trim() }
              : {}),
            ...(isNonEmptyString(branding.logoUrl) ? { logoUrl: branding.logoUrl.trim() } : {}),
          },
        }
      : {}),
    ...(Object.keys(contact).length > 0
      ? {
          contact: {
            ...(isNonEmptyString(contact.supportEmail)
              ? { supportEmail: contact.supportEmail.trim() }
              : {}),
            ...(isNonEmptyString(contact.supportPhone)
              ? { supportPhone: contact.supportPhone.trim() }
              : {}),
          },
        }
      : {}),
    ...(Object.keys(themePalette).length > 0 ? { themePalette } : {}),
    pages: {
      home: rawHome
        .filter(
          (block): block is Record<string, unknown> =>
            !!block && typeof block === "object",
        )
        .map((block) => ({
          type:
            typeof block.type === 'string' && block.type.trim()
              ? block.type.trim()
              : 'banner',
          props:
            block.props && typeof block.props === 'object'
              ? (block.props as Record<string, unknown>)
              : {},
        })),
    },
  };
}

@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

  async listStores() {
    const stores = await this.prisma.store.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        users: {
          where: {
            role: {
              in: ['OWNER', 'ADMIN'] as any,
            },
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return stores.map((store) => this.serializeStore(store));
  }

  async getStore(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        users: {
          where: {
            role: {
              in: ['OWNER', 'ADMIN'] as any,
            },
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    } as any);

    if (!store) {
      throw new NotFoundException(`Store with id ${storeId} was not found`);
    }

    return this.serializeStore(store);
  }

  async createStore(dto: CreateSystemStoreDto) {
    const normalizedDomain = normalizeDomain(dto.domain);
    const normalizedEmail = dto.ownerEmail.trim().toLowerCase();

    const [existingStore, existingOwner] = await Promise.all([
      this.prisma.store.findUnique({
        where: { domain: normalizedDomain },
        select: { id: true },
      }),
      this.prisma.user.findFirst({
        where: { email: normalizedEmail },
        select: { id: true, storeId: true },
      }),
    ]);

    if (existingStore) {
      throw new BadRequestException(
        `A store already exists for domain "${normalizedDomain}"`,
      );
    }

    if (existingOwner) {
      throw new BadRequestException(
        `A user with email "${normalizedEmail}" already exists`,
      );
    }

    const hashedPassword = await bcrypt.hash(dto.ownerPassword, 10);

    const store = await this.prisma.$transaction(async (tx) => {
      const createdStore: any = await tx.store.create({
        data: {
          name: dto.name.trim(),
          domain: normalizedDomain,
          mercadoPagoPublicKey: sanitizeOptionalString(dto.mercadoPagoPublicKey),
          mercadoPagoAccessToken: sanitizeOptionalString(dto.mercadoPagoAccessToken),
          mercadoPagoWebhookSecret: sanitizeOptionalString(
            dto.mercadoPagoWebhookSecret,
          ),
          storefrontConfig: this.buildStorefrontConfig(dto) as Prisma.InputJsonValue,
        },
        include: {
          users: {
            where: {
              role: {
                in: ['OWNER', 'ADMIN'] as any,
              },
            },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      } as any);

      const owner = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: dto.ownerName?.trim() || null,
          role: 'OWNER' as Role,
          storeId: createdStore.id,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      return {
        ...createdStore,
        users: [owner, ...createdStore.users],
      };
    });

    return this.serializeStore(store);
  }

  async updateStore(storeId: number, dto: UpdateSystemStoreDto) {
    const store: any = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        users: {
          where: {
            role: {
              in: ['OWNER', 'ADMIN'] as any,
            },
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    } as any);

    if (!store) {
      throw new NotFoundException(`Store with id ${storeId} was not found`);
    }

    const nextDomain = dto.domain ? normalizeDomain(dto.domain) : store.domain;
    const owner = store.users.find((user: { role: Role }) => user.role === 'OWNER') ?? null;
    const nextOwnerEmail = dto.ownerEmail?.trim().toLowerCase();

    const [domainConflict, emailConflict] = await Promise.all([
      nextDomain !== store.domain
        ? this.prisma.store.findFirst({
            where: {
              domain: nextDomain,
              NOT: {
                id: storeId,
              },
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
      nextOwnerEmail && nextOwnerEmail !== owner?.email
        ? this.prisma.user.findFirst({
            where: {
              email: nextOwnerEmail,
              NOT: owner ? { id: owner.id } : undefined,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (domainConflict) {
      throw new BadRequestException(
        `A store already exists for domain "${nextDomain}"`,
      );
    }

    if (emailConflict) {
      throw new BadRequestException(
        `A user with email "${nextOwnerEmail}" already exists`,
      );
    }

    const nextStorefrontConfig = this.mergeStorefrontConfig(
      toStorefrontConfig(store.storefrontConfig),
      dto,
    );

    const updatedStore = await this.prisma.$transaction(async (tx) => {
      const savedStore = await tx.store.update({
        where: {
          id: storeId,
        },
        data: {
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.domain ? { domain: nextDomain } : {}),
          ...(dto.mercadoPagoPublicKey !== undefined
            ? {
                mercadoPagoPublicKey: sanitizeOptionalString(
                  dto.mercadoPagoPublicKey,
                ),
              }
            : {}),
          ...(dto.mercadoPagoAccessToken !== undefined
            ? {
                mercadoPagoAccessToken: sanitizeOptionalString(
                  dto.mercadoPagoAccessToken,
                ),
              }
            : {}),
          ...(dto.mercadoPagoWebhookSecret !== undefined
            ? {
                mercadoPagoWebhookSecret: sanitizeOptionalString(
                  dto.mercadoPagoWebhookSecret,
                ),
              }
            : {}),
          storefrontConfig: nextStorefrontConfig as Prisma.InputJsonValue,
        },
        include: {
          users: {
            where: {
              role: {
                in: ['OWNER', 'ADMIN'] as any,
              },
            },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      } as any);

      if (owner) {
        await tx.user.update({
          where: {
            id: owner.id,
          },
          data: {
            ...(dto.ownerName !== undefined
              ? { name: sanitizeOptionalString(dto.ownerName) }
              : {}),
            ...(nextOwnerEmail ? { email: nextOwnerEmail } : {}),
            ...(dto.ownerPassword
              ? { password: await bcrypt.hash(dto.ownerPassword, 10) }
              : {}),
          },
        });
      }

      return tx.store.findUnique({
        where: { id: savedStore.id },
        include: {
          users: {
            where: {
              role: {
                in: ['OWNER', 'ADMIN'] as any,
              },
            },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      } as any);
    });

    return this.serializeStore(updatedStore);
  }

  private buildStorefrontConfig(dto: CreateSystemStoreDto) {
    const themePalette = {
      ...defaultPalette,
      ...(dto.accentColor ? { accent: dto.accentColor.trim() } : {}),
      ...(dto.accentStrongColor
        ? { accentStrong: dto.accentStrongColor.trim() }
        : {}),
      ...(dto.backgroundColor
        ? {
            background: dto.backgroundColor.trim(),
            storeShellBg: dto.backgroundColor.trim(),
            accountShellBg: dto.backgroundColor.trim(),
          }
        : {}),
      ...(dto.panelColor
        ? {
            pagePanelBg: dto.panelColor.trim(),
            blockCardBg: dto.panelColor.trim(),
            accountSidebarBg: dto.panelColor.trim(),
          }
        : {}),
    };

    return {
      theme: dto.theme?.trim() || 'minimal',
      branding: {
        ...(dto.tagline ? { tagline: dto.tagline.trim() } : {}),
        ...(dto.description ? { description: dto.description.trim() } : {}),
        ...(dto.logoUrl ? { logoUrl: dto.logoUrl.trim() } : {}),
      },
      contact: {
        ...(dto.supportEmail ? { supportEmail: dto.supportEmail.trim() } : {}),
        ...(dto.supportPhone ? { supportPhone: dto.supportPhone.trim() } : {}),
      },
      themePalette,
      pages: {
        home: [
          {
            type: 'hero',
            props: {
              title: dto.heroTitle?.trim() || dto.name.trim(),
              subtitle:
                dto.heroSubtitle?.trim() ||
                dto.description?.trim() ||
                dto.tagline?.trim() ||
                'Storefront listo para personalizar desde el panel maestro.',
              buttonText: 'Ver catalogo',
              buttonLink: '/product',
              textColor: 'white',
              animationPreset: 'soft',
              backgroundColor:
                dto.backgroundColor?.trim() || defaultPalette.background,
            },
          },
          {
            type: 'featured_products',
            props: {
              title: 'Productos destacados',
              columns: 3,
              animationPreset: 'soft',
            },
          },
          {
            type: 'newsletter',
            props: {
              title: dto.tagline?.trim() || 'Mantene a tus clientes al tanto',
              subtitle:
                dto.description?.trim() ||
                'Captura leads, envios y novedades desde una tienda lanzada en minutos.',
              animationPreset: 'soft',
            },
          },
        ],
      },
    };
  }

  private mergeStorefrontConfig(
    currentConfig: StorefrontConfigShape,
    dto: UpdateSystemStoreDto,
  ) {
    const currentBranding = currentConfig.branding ?? {};
    const currentContact = currentConfig.contact ?? {};
    const nextThemePalette = {
      ...defaultPalette,
      ...(currentConfig.themePalette ?? {}),
      ...(dto.accentColor ? { accent: dto.accentColor.trim() } : {}),
      ...(dto.accentStrongColor
        ? { accentStrong: dto.accentStrongColor.trim() }
        : {}),
      ...(dto.backgroundColor
        ? {
            background: dto.backgroundColor.trim(),
            storeShellBg: dto.backgroundColor.trim(),
            accountShellBg: dto.backgroundColor.trim(),
          }
        : {}),
      ...(dto.panelColor
        ? {
            pagePanelBg: dto.panelColor.trim(),
            blockCardBg: dto.panelColor.trim(),
            accountSidebarBg: dto.panelColor.trim(),
          }
        : {}),
    };

    const home = Array.isArray(currentConfig.pages?.home)
      ? [...currentConfig.pages.home]
      : [];
    const heroBlock = home[0]?.type === 'hero' ? home[0] : null;
    const nextHome = heroBlock
      ? [
          {
            ...heroBlock,
            props: {
              ...(heroBlock.props ?? {}),
              ...(dto.heroTitle ? { title: dto.heroTitle.trim() } : {}),
              ...(dto.heroSubtitle ? { subtitle: dto.heroSubtitle.trim() } : {}),
            },
          },
          ...home.slice(1),
        ]
      : home;

    return {
      ...currentConfig,
      ...(dto.theme ? { theme: dto.theme.trim() } : {}),
      branding: {
        ...currentBranding,
        ...(dto.tagline !== undefined
          ? { tagline: sanitizeOptionalString(dto.tagline) ?? undefined }
          : {}),
        ...(dto.description !== undefined
          ? { description: sanitizeOptionalString(dto.description) ?? undefined }
          : {}),
        ...(dto.logoUrl !== undefined
          ? { logoUrl: sanitizeOptionalString(dto.logoUrl) ?? undefined }
          : {}),
      },
      contact: {
        ...currentContact,
        ...(dto.supportEmail !== undefined
          ? { supportEmail: sanitizeOptionalString(dto.supportEmail) ?? undefined }
          : {}),
        ...(dto.supportPhone !== undefined
          ? { supportPhone: sanitizeOptionalString(dto.supportPhone) ?? undefined }
          : {}),
      },
      themePalette: nextThemePalette,
      pages: {
        home: nextHome,
      },
    };
  }

  private serializeStore(store: any) {
    const storefrontConfig = toStorefrontConfig(store.storefrontConfig);
    const branding = storefrontConfig.branding ?? {};
    const contact = storefrontConfig.contact ?? {};
    const owner =
      store.users.find((user: { role: Role }) => user.role === 'OWNER') ??
      store.users[0] ??
      null;

    return {
      id: store.id,
      name: store.name,
      domain: store.domain,
      createdAt: store.createdAt,
      owner,
      adminCount: store.users.length,
      theme: storefrontConfig.theme ?? 'minimal',
      branding: {
        logoUrl: branding.logoUrl ?? null,
        tagline: branding.tagline ?? null,
        description: branding.description ?? null,
      },
      contact: {
        supportEmail: contact.supportEmail ?? null,
        supportPhone: contact.supportPhone ?? null,
      },
      integrations: {
        mercadopago: {
          publicKeyConfigured: Boolean(store.mercadoPagoPublicKey),
          accessTokenConfigured: Boolean(store.mercadoPagoAccessToken),
          webhookSecretConfigured: Boolean(store.mercadoPagoWebhookSecret),
        },
      },
      provisioning: {
        panelReady: Boolean(owner && store.domain),
        brandingReady: Boolean(branding.logoUrl && branding.tagline),
        paymentsReady: Boolean(
          store.mercadoPagoPublicKey && store.mercadoPagoAccessToken,
        ),
        storefrontReady: Boolean(storefrontConfig.pages?.home?.length),
        domainAutomationPending: true,
      },
      storefrontConfig,
    };
  }
}
