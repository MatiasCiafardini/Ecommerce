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
        (request: { headers?: { cookie?: string }; path?: string; originalUrl?: string }) => {
          const requestPath = request.originalUrl || request.path || '';
          const isSystemRequest = /\/system(\/|$)/.test(requestPath);

          if (isSystemRequest) {
            return (
              extractAuthCookieValue(request.headers?.cookie, 'system') ||
              extractAuthCookieValue(request.headers?.cookie, 'store')
            );
          }

          return (
            extractAuthCookieValue(request.headers?.cookie, 'store') ||
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
