import type { Response } from 'express';
import { runtimeConfig } from '../../../config/runtime-config';

const supportedSameSite = new Set(['lax', 'strict', 'none']);
const apiBasePath = `/${runtimeConfig.apiPrefix.replace(/^\/+|\/+$/g, '')}`;
const systemApiPath = `${apiBasePath}/system`;

function normalizeSameSite() {
  const value = runtimeConfig.authCookieSameSite.toLowerCase();
  return supportedSameSite.has(value) ? value : 'lax';
}

type AuthCookieKind = 'store' | 'system';

function getCookiePath(kind: AuthCookieKind) {
  return kind === 'system' ? systemApiPath : apiBasePath;
}

export function getAuthCookieName(kind: AuthCookieKind = 'store') {
  if (kind === 'system') {
    return runtimeConfig.systemAuthCookieName;
  }

  return runtimeConfig.authCookieName;
}

export function setAuthCookie(
  response: Response,
  token: string,
  kind: AuthCookieKind = 'store',
) {
  response.cookie(getAuthCookieName(kind), token, {
    httpOnly: true,
    secure: runtimeConfig.authCookieSecure,
    sameSite: normalizeSameSite() as 'lax' | 'strict' | 'none',
    domain: runtimeConfig.authCookieDomain,
    path: getCookiePath(kind),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(response: Response, kind: AuthCookieKind = 'store') {
  response.clearCookie(getAuthCookieName(kind), {
    httpOnly: true,
    secure: runtimeConfig.authCookieSecure,
    sameSite: normalizeSameSite() as 'lax' | 'strict' | 'none',
    domain: runtimeConfig.authCookieDomain,
    path: getCookiePath(kind),
  });
}

export function extractCookieValue(rawCookieHeader: string | undefined, name: string) {
  if (!rawCookieHeader) {
    return null;
  }

  for (const chunk of rawCookieHeader.split(';')) {
    const [rawKey, ...rawValue] = chunk.trim().split('=');

    if (rawKey !== name) {
      continue;
    }

    const value = rawValue.join('=').trim();
    return value ? decodeURIComponent(value) : null;
  }

  return null;
}

export function extractAuthCookieValue(
  rawCookieHeader: string | undefined,
  kind: AuthCookieKind = 'store',
) {
  return extractCookieValue(rawCookieHeader, getAuthCookieName(kind));
}
