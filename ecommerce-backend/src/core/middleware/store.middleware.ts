import {
  BadRequestException,
  Injectable,
  Logger,
  NestMiddleware,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function normalizeHost(rawHost?: string | string[] | null) {
  const firstValue = Array.isArray(rawHost) ? rawHost[0] : rawHost;
  const host = firstValue?.split(',')[0]?.trim().toLowerCase() ?? '';

  if (!host) {
    return '';
  }

  const withoutProtocol = host.replace(/^[a-z]+:\/\//i, '');
  const withoutPath = withoutProtocol.split('/')[0]?.trim() ?? '';

  return withoutPath.replace(/\.$/, '');
}

function isWebhookPath(path: string) {
  return (
    path.startsWith('/api/payments/webhook') ||
    path.startsWith('/api/integrations/enviopack/webhook')
  );
}

function isSystemPath(path: string) {
  return path.startsWith('/api/system');
}

@Injectable()
export class StoreMiddleware implements NestMiddleware {
  private readonly logger = new Logger(StoreMiddleware.name);

  constructor(private readonly prisma: PrismaService) {}

  async use(req: any, res: any, next: () => void) {
    const path = String(req.path || req.originalUrl || '');

    if (isWebhookPath(path) || isSystemPath(path)) {
      return next();
    }

    const headerStoreId = this.parseStoreIdHeader(req.headers['x-store-id']);
    const explicitStoreHost = normalizeHost(req.headers['x-store-host']);
    const forwardedHost = normalizeHost(req.headers['x-forwarded-host']);
    const requestHost = normalizeHost(explicitStoreHost || forwardedHost || req.headers.host);

    const [storeFromHeader, storeFromHost] = await Promise.all([
      headerStoreId ? this.findStoreById(headerStoreId) : Promise.resolve(null),
      requestHost ? this.findStoreByHost(requestHost) : Promise.resolve(null),
    ]);

    if (headerStoreId && !storeFromHeader) {
      throw new NotFoundException(`Store with id ${headerStoreId} was not found`);
    }

    if (explicitStoreHost && !storeFromHost) {
      throw new NotFoundException(
        `Store is not configured for host "${explicitStoreHost}"`,
      );
    }

    if (requestHost && !storeFromHost && !headerStoreId) {
      throw new NotFoundException(
        `Store is not configured for host "${requestHost}"`,
      );
    }

    if (
      headerStoreId &&
      storeFromHeader &&
      storeFromHost &&
      storeFromHeader.id !== storeFromHost.id
    ) {
      throw new BadRequestException(
        `x-store-id ${headerStoreId} does not match host "${requestHost}"`,
      );
    }

    const resolvedStore = storeFromHeader ?? storeFromHost;

    if (!resolvedStore) {
      throw new BadRequestException(
        'x-store-id header is required when the host is not mapped to a store',
      );
    }

    req.storeId = resolvedStore.id;
    req.store = resolvedStore;
    req.headers['x-store-id'] = String(resolvedStore.id);

    if (requestHost) {
      req.headers['x-store-host'] = requestHost;
    }

    if (!headerStoreId && requestHost) {
      this.logger.log(
        `Resolved tenant storeId=${resolvedStore.id} from host "${requestHost}"`,
      );
    }

    next();
  }

  private parseStoreIdHeader(rawStoreId?: string | string[]) {
    const firstValue = Array.isArray(rawStoreId) ? rawStoreId[0] : rawStoreId;

    if (firstValue === undefined || firstValue === null || firstValue === '') {
      return null;
    }

    const parsedStoreId = Number(firstValue);

    if (!Number.isInteger(parsedStoreId) || parsedStoreId <= 0) {
      throw new BadRequestException('x-store-id must be a positive integer');
    }

    return parsedStoreId;
  }

  private findStoreById(storeId: number) {
    return this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        domain: true,
        name: true,
      },
    } as any);
  }

  private findStoreByHost(host: string) {
    const normalizedHost = normalizeHost(host);
    const hostWithoutPort = normalizedHost.replace(/:\d+$/, '');

    return this.prisma.store.findFirst({
      where: {
        OR:
          hostWithoutPort !== normalizedHost
            ? [{ domain: normalizedHost }, { domain: hostWithoutPort }]
            : [{ domain: normalizedHost }],
      },
      select: {
        id: true,
        domain: true,
        name: true,
      },
    } as any);
  }
}
