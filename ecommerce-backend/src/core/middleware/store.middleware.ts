import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const STORE_ID_ALIASES: Record<number, number> = {
  3: 3003,
};

const KNOWN_STORE_HOSTS: Record<string, number> = {
  'estudiosmc.cloud': 1,
  'www.estudiosmc.cloud': 1,
  'trojani.com.ar': 3003,
  'www.trojani.com.ar': 3003,
};

function normalizeStoreId(rawStoreId: number) {
  return STORE_ID_ALIASES[rawStoreId] ?? rawStoreId;
}

function normalizeHost(rawHost?: string | null) {
  const host = rawHost?.split(',')[0]?.trim().toLowerCase() ?? '';

  if (!host) {
    return '';
  }

  return host.replace(/\.$/, '');
}

@Injectable()
export class StoreMiddleware implements NestMiddleware {
  private readonly logger = new Logger(StoreMiddleware.name);

  constructor(private readonly prisma: PrismaService) {}

  async use(req: any, res: any, next: () => void) {
    const path = String(req.path || req.originalUrl || '');
    const bypassPaths = [
      '/api/payments/webhook',
      '/api/integrations/enviopack/webhook',
    ];

    if (bypassPaths.some((candidate) => path.startsWith(candidate))) {
      return next();
    }

    const storeIdHeader = req.headers['x-store-id'];

    if (storeIdHeader) {
      const parsedStoreId = Number(storeIdHeader);

      if (Number.isNaN(parsedStoreId)) {
        throw new BadRequestException('x-store-id must be a number');
      }

      req.storeId = normalizeStoreId(parsedStoreId);

      return next();
    }

    const forwardedHost = normalizeHost(req.headers['x-forwarded-host']);
    const host = normalizeHost(forwardedHost || req.headers.host);

    if (!host) {
      throw new BadRequestException('x-store-id header is required');
    }

    const knownStoreId = KNOWN_STORE_HOSTS[host];

    if (knownStoreId) {
      req.storeId = normalizeStoreId(knownStoreId);
      req.headers['x-store-id'] = String(req.storeId);
      this.logger.log(`Resolved storeId ${req.storeId} from known host "${host}"`);
      return next();
    }

    const store = await this.prisma.store.findFirst({
      where: {
        OR: [
          { domain: host },
          { domain: host.replace(/:\d+$/, '') },
        ],
      },
      select: {
        id: true,
        domain: true,
      },
    });

    if (!store) {
      throw new BadRequestException('x-store-id header is required');
    }

    req.storeId = normalizeStoreId(store.id);
    req.headers['x-store-id'] = String(req.storeId);
    this.logger.log(`Resolved storeId ${req.storeId} from host "${host}"`);

    next();
  }
}
