import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getJwtSecret } from '../utils/jwt-secret.util';
import {
  extractCookieValue,
  getAuthCookieName,
} from '../utils/auth-cookie.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: { headers?: { cookie?: string } }) =>
          extractCookieValue(request.headers?.cookie, getAuthCookieName()),
      ]),
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: any) {
    return payload;
  }
}
