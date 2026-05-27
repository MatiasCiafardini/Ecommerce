import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getJwtSecret } from '../utils/jwt-secret.util';
import {
  extractAuthCookieValue,
} from '../utils/auth-cookie.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: {
          headers?: { cookie?: string; 'x-store-id'?: string | string[] };
          path?: string;
          originalUrl?: string;
        }) => {
          const requestPath = request.originalUrl || request.path || '';
          const isSystemRequest = /\/system(\/|$)/.test(requestPath);
          const rawStoreId = request.headers?.['x-store-id'];
          const storeIdValue = Array.isArray(rawStoreId) ? rawStoreId[0] : rawStoreId;
          const storeId = Number(storeIdValue);
          const scopedStoreId = Number.isInteger(storeId) && storeId > 0 ? storeId : null;

          if (isSystemRequest) {
            return (
              extractAuthCookieValue(request.headers?.cookie, 'system') ||
              extractAuthCookieValue(request.headers?.cookie, 'store', scopedStoreId)
            );
          }

          return (
            extractAuthCookieValue(request.headers?.cookie, 'store', scopedStoreId) ||
            extractAuthCookieValue(request.headers?.cookie, 'system')
          );
        },
      ]),
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: any) {
    return payload;
  }
}
