import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { execFile } from 'child_process';
import { access, readFile, writeFile } from 'fs/promises';
import { dirname, isAbsolute } from 'path';
import { promisify } from 'util';
import { PrismaService } from '../../prisma/prisma.service';
import { runtimeConfig } from '../../config/runtime-config';
import { CreateSystemStoreDto } from './dto/create-system-store.dto';
import { UpdateSystemStoreDto } from './dto/update-system-store.dto';
import { CreateSystemStoreUserDto } from './dto/create-system-store-user.dto';
import { UpdateSystemStoreUserDto } from './dto/update-system-store-user.dto';

type StorefrontSection = Record<string, unknown>;
type ThemeCatalogEntry = {
  id: string;
  label: string;
  description: string;
  tone: string;
  surfaces: {
    background: string;
    panel: string;
    accent: string;
    text: string;
  };
};
type StoreProvisioningPlan = {
  automationEnabled: boolean;
  storeId: number;
  domain: string;
  wwwDomain: string;
  proxyTarget: string;
  files: {
    storefrontEnvPath: string | null;
    backendEnvPath: string | null;
    nginxSitePath: string | null;
    deployScriptPath: string | null;
  };
  entries: {
    hostMap: string[];
    corsOrigins: string[];
  };
  nginx: {
    httpOnlyBlock: string;
    managedBlock: string;
  };
  commands: string[];
  notes: string[];
};
type StoreProvisioningResult = {
  ok: boolean;
  executedAt: string;
  steps: string[];
  plan: StoreProvisioningPlan;
};
type PlatformDeployResult = {
  ok: boolean;
  executedAt: string;
  command: string;
  outputPreview: string;
};
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

const availableThemes: ThemeCatalogEntry[] = [
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Base editorial sobria para marcas urbanas o multiproducto.',
    tone: 'Versatil',
    surfaces: {
      background: '#06131a',
      panel: '#0d1f29',
      accent: '#53b7c7',
      text: '#f7fbfc',
    },
  },
  {
    id: 'fashion',
    label: 'Fashion',
    description: 'Look boutique suave, ideal para indumentaria femenina y marcas delicadas.',
    tone: 'Boutique',
    surfaces: {
      background: '#f5e8dc',
      panel: '#fff8f2',
      accent: '#b16f5f',
      text: '#231815',
    },
  },
  {
    id: 'trojani',
    label: 'Trojani',
    description: 'Theme premium con impronta de marca fuerte y visual hero protagonista.',
    tone: 'Marca fuerte',
    surfaces: {
      background: '#f1ebe2',
      panel: '#fffdf9',
      accent: '#8a5f37',
      text: '#20150f',
    },
  },
  {
    id: 'libreria',
    label: 'Libreria',
    description: 'Estetica amable y colorida para librerias, regalos, artistica o escolar.',
    tone: 'Colorido',
    surfaces: {
      background: '#fff3f7',
      panel: '#ffffff',
      accent: '#d46b95',
      text: '#5f3346',
    },
  },
  {
    id: 'mimaria',
    label: 'Mi Maria',
    description: 'Tema calido y femenino para boutiques de indumentaria con tono elegante.',
    tone: 'Calido',
    surfaces: {
      background: '#f4ede6',
      panel: '#fffaf5',
      accent: '#a87555',
      text: '#38261b',
    },
  },
  {
    id: 'milashoes',
    label: 'Mila Shoes',
    description: 'Tema minimalista, femenino y premium para tiendas de calzado con mucho aire visual.',
    tone: 'Minimal premium',
    surfaces: {
      background: '#f6f1ea',
      panel: '#fffdfa',
      accent: '#a27d62',
      text: '#161311',
    },
  },
  {
    id: 'comovosyyo',
    label: 'Como Vos y Yo',
    description: 'Clon inicial de Mila Shoes para una nueva tienda lista para personalizar.',
    tone: 'Minimal premium',
    surfaces: {
      background: '#f6f1ea',
      panel: '#fffdfa',
      accent: '#a27d62',
      text: '#161311',
    },
  },
];
const execFileAsync = promisify(execFile);
const managedSystemUserRoles = new Set<Role>([Role.OWNER, Role.ADMIN, Role.STAFF]);
const creatableSystemUserRoles = new Set<Role>([Role.ADMIN, Role.STAFF]);
const systemStoreUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

function normalizeDomain(value: string) {
  const normalizedDomain = value
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//i, '')
    .split('/')[0]
    .replace(/\.$/, '');

  return normalizedDomain.startsWith('www.')
    ? normalizedDomain.slice(4)
    : normalizedDomain;
}

function slugifyStoreName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildPreviewOnlyDomain(storeName: string) {
  const slug = slugifyStoreName(storeName) || 'tienda';
  return `${slug}.preview.internal`;
}

function isPreviewOnlyDomain(domain: string) {
  return domain.endsWith('.preview.internal');
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
  private platformDeployRunning = false;

  constructor(private readonly prisma: PrismaService) {}

  listThemes() {
    return availableThemes;
  }

  async getStoreProvisioningPlan(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        domain: true,
      },
    });

    if (!store) {
      throw new NotFoundException(`Store with id ${storeId} was not found`);
    }

    return this.buildProvisioningPlan(store.id, store.domain);
  }

  async provisionStoreOnVps(storeId: number): Promise<StoreProvisioningResult> {
    const plan = await this.getStoreProvisioningPlan(storeId);

    if (!runtimeConfig.systemVpsAutomationEnabled) {
      throw new BadRequestException(
        'SYSTEM_VPS_AUTOMATION_ENABLED is disabled for this environment.',
      );
    }

    await Promise.all([
      this.ensureConfiguredPath(
        runtimeConfig.systemStorefrontEnvPath,
        'SYSTEM_STOREFRONT_ENV_PATH',
      ),
      this.ensureConfiguredPath(
        runtimeConfig.systemBackendEnvPath,
        'SYSTEM_BACKEND_ENV_PATH',
      ),
      this.ensureConfiguredPath(
        runtimeConfig.systemDeployScriptPath,
        'SYSTEM_DEPLOY_SCRIPT_PATH',
      ),
      this.ensureConfiguredPath(
        runtimeConfig.systemNginxSitePath,
        'SYSTEM_NGINX_SITE_PATH',
      ),
    ]);

    await this.assertProvisioningCanRun(
      runtimeConfig.systemNginxSitePath!,
      storeId,
      plan,
    );

    const steps: string[] = [];

    await this.upsertEnvListValue(
      runtimeConfig.systemStorefrontEnvPath!,
      'NEXT_PUBLIC_STORE_HOST_MAP',
      plan.entries.hostMap,
    );
    steps.push(
      `Storefront env actualizado con ${plan.entries.hostMap.join(', ')}`,
    );

    await this.upsertEnvListValue(
      runtimeConfig.systemBackendEnvPath!,
      'CORS_ORIGINS',
      plan.entries.corsOrigins,
    );
    steps.push(
      `Backend env actualizado con ${plan.entries.corsOrigins.join(', ')}`,
    );

    await this.ensureManagedNginxBlocks(
      runtimeConfig.systemNginxSitePath!,
      storeId,
      plan.nginx.httpOnlyBlock,
    );
    await this.runShell('nginx -t', true);
    await this.runShell('systemctl reload nginx', true);
    steps.push('Nginx recargado con bloque HTTP inicial para validacion ACME');

    if (runtimeConfig.systemCertbotEnabled) {
      await this.runShell(
        `certbot certonly --webroot -w "${runtimeConfig.systemCertbotWebroot}" -d "${plan.domain}" -d "${plan.wwwDomain}" --non-interactive --agree-tos --keep-until-expiring`,
        true,
      );
      steps.push('Certbot ejecuto la emision/renovacion del certificado');
    } else {
      steps.push(
        'Certbot omitido: SYSTEM_CERTBOT_ENABLED=false, se asume certificado existente o paso manual previo.',
      );
    }

    await this.ensureManagedNginxBlocks(
      runtimeConfig.systemNginxSitePath!,
      storeId,
      plan.nginx.managedBlock,
    );
    await this.runShell('nginx -t', true);
    await this.runShell('systemctl reload nginx', true);
    steps.push('Nginx recargado con bloque HTTPS productivo');

    await this.runShell(`bash "${runtimeConfig.systemDeployScriptPath!}"`);
    steps.push(`Deploy ejecutado con ${runtimeConfig.systemDeployScriptPath}`);

    return {
      ok: true,
      executedAt: new Date().toISOString(),
      steps,
      plan,
    };
  }

  async deployPlatform(): Promise<PlatformDeployResult> {
    if (this.platformDeployRunning) {
      throw new BadRequestException(
        'Ya hay un deploy de plataforma en ejecucion.',
      );
    }

    await this.ensureConfiguredPath(
      runtimeConfig.systemDeployScriptPath,
      'SYSTEM_DEPLOY_SCRIPT_PATH',
    );

    this.platformDeployRunning = true;

    try {
      const result = await this.runShell(
        `bash "${runtimeConfig.systemDeployScriptPath!}"`,
      );
      const outputPreview = [result.stdout, result.stderr]
        .filter(Boolean)
        .join('\n')
        .trim()
        .split('\n')
        .slice(-40)
        .join('\n');

      return {
        ok: true,
        executedAt: new Date().toISOString(),
        command: `bash "${runtimeConfig.systemDeployScriptPath!}"`,
        outputPreview,
      };
    } finally {
      this.platformDeployRunning = false;
    }
  }

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

  async listStoreUsers(storeId: number) {
    await this.ensureStoreExists(storeId);

    const users = await this.prisma.user.findMany({
      where: {
        storeId,
        role: {
          in: Array.from(managedSystemUserRoles),
        },
      },
      select: systemStoreUserSelect,
      orderBy: {
        createdAt: 'asc',
      },
    });

    return this.sortStoreUsers(users).map((user) => this.serializeStoreUser(user));
  }

  async createStoreUser(storeId: number, dto: CreateSystemStoreUserDto) {
    await this.ensureStoreExists(storeId);
    const normalizedEmail = dto.email.trim().toLowerCase();
    const nextRole = dto.role as Role;

    if (!creatableSystemUserRoles.has(nextRole)) {
      throw new BadRequestException(
        'Solo se pueden crear usuarios con rol ADMIN o STAFF desde este panel.',
      );
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
        storeId: true,
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        `A user with email "${normalizedEmail}" already exists`,
      );
    }

    const createdUser = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password: await bcrypt.hash(dto.password, 10),
        name: sanitizeOptionalString(dto.name),
        role: nextRole,
        storeId,
      },
      select: systemStoreUserSelect,
    });

    return this.serializeStoreUser(createdUser);
  }

  async updateStoreUser(
    storeId: number,
    userId: number,
    dto: UpdateSystemStoreUserDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        storeId,
        role: {
          in: Array.from(managedSystemUserRoles),
        },
      },
      select: systemStoreUserSelect,
    });

    if (!user) {
      throw new NotFoundException(
        `User with id ${userId} was not found for store ${storeId}`,
      );
    }

    if (user.role === Role.OWNER && dto.role) {
      throw new BadRequestException(
        'El rol OWNER se administra desde la ficha principal de la tienda.',
      );
    }

    const normalizedEmail = dto.email?.trim().toLowerCase();

    if (normalizedEmail && normalizedEmail !== user.email) {
      const emailConflict = await this.prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          NOT: {
            id: userId,
          },
        },
        select: {
          id: true,
        },
      });

      if (emailConflict) {
        throw new BadRequestException(
          `A user with email "${normalizedEmail}" already exists`,
        );
      }
    }

    if (dto.role && !creatableSystemUserRoles.has(dto.role as Role)) {
      throw new BadRequestException(
        'Solo se pueden asignar roles ADMIN o STAFF desde este panel.',
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
        ...(dto.name !== undefined
          ? { name: sanitizeOptionalString(dto.name) }
          : {}),
        ...(dto.password
          ? { password: await bcrypt.hash(dto.password, 10) }
          : {}),
        ...(dto.role ? { role: dto.role as Role } : {}),
      },
      select: systemStoreUserSelect,
    });

    return this.serializeStoreUser(updatedUser);
  }

  async deleteStoreUser(storeId: number, userId: number) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        storeId,
        role: {
          in: Array.from(managedSystemUserRoles),
        },
      },
      select: systemStoreUserSelect,
    });

    if (!user) {
      throw new NotFoundException(
        `User with id ${userId} was not found for store ${storeId}`,
      );
    }

    if (user.role === Role.OWNER) {
      throw new BadRequestException(
        'El owner no se puede eliminar desde el panel de usuarios.',
      );
    }

    await this.prisma.user.delete({
      where: {
        id: userId,
      },
    });

    return {
      ok: true,
      deletedUserId: userId,
    };
  }

  async createStore(dto: CreateSystemStoreDto) {
    const normalizedDomain = dto.domain?.trim()
      ? normalizeDomain(dto.domain)
      : buildPreviewOnlyDomain(dto.name);
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
          manualSalesEnabled: dto.manualSalesEnabled ?? false,
          bankTransferAlias: sanitizeOptionalString(dto.bankTransferAlias),
          bankTransferDiscountPercentage: this.normalizeBankTransferDiscount(
            dto.bankTransferDiscountPercentage,
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
          ...(dto.manualSalesEnabled !== undefined
            ? { manualSalesEnabled: dto.manualSalesEnabled }
            : {}),
          ...(dto.bankTransferAlias !== undefined
            ? { bankTransferAlias: sanitizeOptionalString(dto.bankTransferAlias) }
            : {}),
          ...(dto.bankTransferDiscountPercentage !== undefined
            ? {
                bankTransferDiscountPercentage: this.normalizeBankTransferDiscount(
                  dto.bankTransferDiscountPercentage,
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
              limit: 6,
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

  private buildProvisioningPlan(
    storeId: number,
    domain: string,
  ): StoreProvisioningPlan {
    const normalizedDomain = normalizeDomain(domain);
    const wwwDomain = normalizedDomain.startsWith('www.')
      ? normalizedDomain
      : `www.${normalizedDomain}`;
    const hostMapEntries = [
      `${normalizedDomain}=${storeId}`,
      `${wwwDomain}=${storeId}`,
    ];
    const corsOrigins = [
      `https://${normalizedDomain}`,
      `https://${wwwDomain}`,
    ];

    return {
      automationEnabled: runtimeConfig.systemVpsAutomationEnabled,
      storeId,
      domain: normalizedDomain,
      wwwDomain,
      proxyTarget: runtimeConfig.systemNginxProxyTarget,
      files: {
        storefrontEnvPath: runtimeConfig.systemStorefrontEnvPath ?? null,
        backendEnvPath: runtimeConfig.systemBackendEnvPath ?? null,
        nginxSitePath: runtimeConfig.systemNginxSitePath ?? null,
        deployScriptPath: runtimeConfig.systemDeployScriptPath ?? null,
      },
      entries: {
        hostMap: hostMapEntries,
        corsOrigins,
      },
      nginx: {
        httpOnlyBlock: this.buildManagedNginxBlock({
          storeId,
          domain: normalizedDomain,
          wwwDomain,
          includeHttps: false,
        }),
        managedBlock: this.buildManagedNginxBlock({
          storeId,
          domain: normalizedDomain,
          wwwDomain,
          includeHttps: true,
        }),
      },
      commands: [
        `Actualizar NEXT_PUBLIC_STORE_HOST_MAP con ${hostMapEntries.join(', ')}`,
        `Actualizar CORS_ORIGINS con ${corsOrigins.join(', ')}`,
        `bash ${runtimeConfig.systemDeployScriptPath ?? '/var/www/ecommerce/deploy.sh'}`,
      ],
      notes: [
        'Cloudflare DNS debe estar apuntando a la VPS antes de correr Certbot.',
        'La automatizacion de VPS toca solo archivos y comandos predefinidos.',
        'Si Certbot esta deshabilitado, el dominio debe tener certificado previo o ese paso sigue manual.',
      ],
    };
  }

  private buildManagedNginxBlock({
    storeId,
    domain,
    wwwDomain,
    includeHttps,
  }: {
    storeId: number;
    domain: string;
    wwwDomain: string;
    includeHttps: boolean;
  }) {
    const markerStart = this.nginxMarkerStart(storeId);
    const markerEnd = this.nginxMarkerEnd(storeId);
    const httpBlock = `server {
    listen 80;
    server_name ${domain} ${wwwDomain};

    location /.well-known/acme-challenge/ {
        root ${runtimeConfig.systemCertbotWebroot};
    }

    location / {
        return 301 https://$host$request_uri;
    }
}`;

    if (!includeHttps) {
      return `${markerStart}\n${httpBlock}\n${markerEnd}`;
    }

    const httpsBlock = `server {
    listen 443 ssl http2;
    server_name ${domain} ${wwwDomain};
    client_max_body_size 12m;

    ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass ${runtimeConfig.systemNginxProxyTarget};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 120s;
    }
}`;

    return `${markerStart}\n${httpBlock}\n\n${httpsBlock}\n${markerEnd}`;
  }

  private async assertProvisioningCanRun(
    filePath: string,
    storeId: number,
    plan: StoreProvisioningPlan,
  ) {
    const currentContent = await readFile(filePath, 'utf8');
    const startMarker = this.nginxMarkerStart(storeId);
    const endMarker = this.nginxMarkerEnd(storeId);
    const escapedStart = this.escapeRegex(startMarker);
    const escapedEnd = this.escapeRegex(endMarker);
    const managedPattern = new RegExp(
      `${escapedStart}[\\s\\S]*?${escapedEnd}\\n?`,
      'm',
    );
    const unmanagedServerNamePattern = new RegExp(
      `server_name\\s+${this.escapeRegex(plan.domain)}\\s+${this.escapeRegex(plan.wwwDomain)};`,
      'm',
    );

    if (
      !managedPattern.test(currentContent) &&
      unmanagedServerNamePattern.test(currentContent)
    ) {
      throw new BadRequestException(
        `El dominio "${plan.domain}" ya tiene una configuracion activa en Nginx fuera del flujo CODEX. Migrala primero o usalo solo para dominios nuevos.`,
      );
    }
  }

  private nginxMarkerStart(storeId: number) {
    return `# BEGIN CODEX STORE ${storeId}`;
  }

  private nginxMarkerEnd(storeId: number) {
    return `# END CODEX STORE ${storeId}`;
  }

  private async ensureManagedNginxBlocks(
    filePath: string,
    storeId: number,
    block: string,
  ) {
    const currentContent = await readFile(filePath, 'utf8');
    const startMarker = this.nginxMarkerStart(storeId);
    const endMarker = this.nginxMarkerEnd(storeId);
    const escapedStart = this.escapeRegex(startMarker);
    const escapedEnd = this.escapeRegex(endMarker);
    const pattern = new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}\\n?`, 'm');
    const nextContent = pattern.test(currentContent)
      ? currentContent.replace(pattern, `${block}\n`)
      : `${currentContent.trimEnd()}\n\n${block}\n`;

    await writeFile(filePath, nextContent, 'utf8');
  }

  private async upsertEnvListValue(
    filePath: string,
    key: string,
    entries: string[],
  ) {
    const currentContent = await readFile(filePath, 'utf8');
    const pattern = new RegExp(`^${this.escapeRegex(key)}=(.*)$`, 'm');
    const match = currentContent.match(pattern);
    const existingValues = this.parseEnvList(match?.[1]);
    const mergedValues = [...new Set([...existingValues, ...entries])];
    const line = `${key}="${mergedValues.join(',')}"`;
    const nextContent = match
      ? currentContent.replace(pattern, line)
      : `${currentContent.trimEnd()}\n${line}\n`;

    await writeFile(filePath, nextContent, 'utf8');
  }

  private parseEnvList(rawValue?: string | null) {
    if (!rawValue) {
      return [];
    }

    return rawValue
      .trim()
      .replace(/^['"]|['"]$/g, '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async ensureConfiguredPath(value: string | undefined, envName: string) {
    if (!value) {
      throw new BadRequestException(`${envName} is not configured.`);
    }

    if (!isAbsolute(value)) {
      throw new BadRequestException(`${envName} must be an absolute path.`);
    }

    await access(value);
  }

  private async runShell(command: string, privileged = false) {
    const prefix =
      privileged && runtimeConfig.systemPrivilegedCommandPrefix
        ? `${runtimeConfig.systemPrivilegedCommandPrefix} `
        : '';
    const { stdout, stderr } = await execFileAsync(
      'bash',
      ['-lc', `${prefix}${command}`],
      {
        cwd: dirname(runtimeConfig.systemDeployScriptPath ?? process.cwd()),
      },
    );

    return { stdout, stderr };
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
      domain: normalizeDomain(store.domain),
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
        bankTransfer: {
          alias: store.bankTransferAlias ?? null,
          discountPercentage: Number(store.bankTransferDiscountPercentage ?? 0),
        },
      },
      features: {
        manualSalesEnabled: Boolean(store.manualSalesEnabled),
      },
      provisioning: {
        panelReady: Boolean(owner && store.domain),
        brandingReady: Boolean(branding.logoUrl && branding.tagline),
        paymentsReady: Boolean(
          store.mercadoPagoPublicKey && store.mercadoPagoAccessToken,
        ),
        storefrontReady: Boolean(storefrontConfig.pages?.home?.length),
        vpsAutomationReady: runtimeConfig.systemVpsAutomationEnabled,
        domainAutomationPending: true,
      },
      previewOnly: isPreviewOnlyDomain(normalizeDomain(store.domain)),
      storefrontConfig,
    };
  }

  private serializeStoreUser(user: {
    id: number;
    email: string;
    name: string | null;
    role: Role;
    createdAt: Date;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      role: user.role,
      createdAt: user.createdAt,
      isOwner: user.role === Role.OWNER,
    };
  }

  private sortStoreUsers<
    T extends {
      role: Role;
      createdAt: Date;
    },
  >(users: T[]) {
    const roleOrder: Record<Role, number> = {
      SUPER_ADMIN: 99,
      OWNER: 0,
      ADMIN: 1,
      STAFF: 2,
    };

    return [...users].sort((left, right) => {
      const roleDiff = roleOrder[left.role] - roleOrder[right.role];
      if (roleDiff !== 0) {
        return roleDiff;
      }

      return left.createdAt.getTime() - right.createdAt.getTime();
    });
  }

  private async ensureStoreExists(storeId: number) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });

    if (!store) {
      throw new NotFoundException(`Store with id ${storeId} was not found`);
    }
  }

  private normalizeBankTransferDiscount(value?: number | null) {
    const numericValue = Number(value ?? 0);

    if (!Number.isFinite(numericValue)) {
      return 0;
    }

    return Math.max(0, Math.min(Number(numericValue.toFixed(2)), 100));
  }
}
