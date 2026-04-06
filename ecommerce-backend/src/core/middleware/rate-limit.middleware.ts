import {
  HttpException,
  HttpStatus,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { runtimeConfig } from '../../config/runtime-config';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitRule = {
  key: string;
  max: number;
  matches: (path: string) => boolean;
};

function normalizeIp(rawIp?: string | string[]) {
  const firstValue = Array.isArray(rawIp) ? rawIp[0] : rawIp;
  return firstValue?.split(',')[0]?.trim() || 'unknown';
}

function startsWithAny(path: string, candidates: string[]) {
  return candidates.some((candidate) => path.startsWith(candidate));
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly rules: RateLimitRule[] = [
    {
      key: 'auth',
      max: runtimeConfig.authRateLimitMax,
      matches: (path) =>
        startsWithAny(path, [
          '/api/auth/login',
          '/auth/login',
          '/api/auth/session-login',
          '/auth/session-login',
          '/api/auth/customer/login',
          '/auth/customer/login',
          '/api/system/auth/login',
          '/system/auth/login',
        ]),
    },
    {
      key: 'webhook',
      max: runtimeConfig.webhookRateLimitMax,
      matches: (path) =>
        startsWithAny(path, [
          '/api/payments/webhook',
          '/payments/webhook',
          '/api/integrations/enviopack/webhook',
          '/integrations/enviopack/webhook',
        ]),
    },
  ];

  use(req: any, res: any, next: () => void) {
    const path = String(req.originalUrl || req.path || '');
    const rule = this.rules.find((candidate) => candidate.matches(path));

    if (!rule) {
      next();
      return;
    }

    const now = Date.now();
    const bucketKey = `${rule.key}:${normalizeIp(req.ip || req.headers['x-forwarded-for'])}`;
    const currentBucket = this.buckets.get(bucketKey);

    if (!currentBucket || currentBucket.resetAt <= now) {
      const resetAt = now + runtimeConfig.rateLimitWindowMs;
      this.buckets.set(bucketKey, { count: 1, resetAt });
      next();
      return;
    }

    if (currentBucket.count >= rule.max) {
      const secondsUntilReset = Math.max(
        1,
        Math.ceil((currentBucket.resetAt - now) / 1000),
      );
      res.setHeader('Retry-After', secondsUntilReset);
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    currentBucket.count += 1;
    next();
  }
}
