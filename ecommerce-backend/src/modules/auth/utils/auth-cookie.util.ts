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

function normalizeHostname(value: string | undefined) {
  if (!value) {
    return '';
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
    .replace(/^\.+/, '');
}

function resolveCookieDomain(requestHost?: string) {
  const configuredDomain = runtimeConfig.authCookieDomain?.trim();

  if (!configuredDomain) {
    return undefined;
  }

  const normalizedConfiguredDomain = normalizeHostname(configuredDomain);
  const normalizedRequestHost = normalizeHostname(requestHost);

  if (!normalizedRequestHost) {
    return configuredDomain;
  }

  if (
    normalizedRequestHost === normalizedConfiguredDomain ||
    normalizedRequestHost.endsWith(`.${normalizedConfiguredDomain}`)
  ) {
    return configuredDomain;
  }

  return undefined;
}

export function getAuthCookieName(kind: AuthCookieKind = 'store') {
  if (kind === 'system') {
    return runtimeConfig.systemAuthCookieName;
  }

  return runtimeConfig.authCookieName;
}

function getStoreScopedAuthCookieName(storeId?: number | null) {
  return storeId && Number.isInteger(storeId) && storeId > 0
    ? `${runtimeConfig.authCookieName}_store_${storeId}`
    : runtimeConfig.authCookieName;
}

export function setAuthCookie(
  response: Response,
  token: string,
  kind: AuthCookieKind = 'store',
  requestHost?: string,
  storeId?: number | null,
) {
  response.cookie(kind === 'store' ? getStoreScopedAuthCookieName(storeId) : getAuthCookieName(kind), token, {
    httpOnly: true,
    secure: runtimeConfig.authCookieSecure,
    sameSite: normalizeSameSite() as 'lax' | 'strict' | 'none',
    domain: resolveCookieDomain(requestHost),
    path: getCookiePath(kind),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(
  response: Response,
  kind: AuthCookieKind = 'store',
  requestHost?: string,
  storeId?: number | null,
) {
  const options = {
    httpOnly: true,
    secure: runtimeConfig.authCookieSecure,
    sameSite: normalizeSameSite() as 'lax' | 'strict' | 'none',
    domain: resolveCookieDomain(requestHost),
    path: getCookiePath(kind),
  };

  response.clearCookie(kind === 'store' ? getStoreScopedAuthCookieName(storeId) : getAuthCookieName(kind), options);

  if (kind === 'store') {
    response.clearCookie(getAuthCookieName(kind), options);
  }
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
  storeId?: number | null,
) {
  if (kind === 'store' && storeId) {
    return extractCookieValue(rawCookieHeader, getStoreScopedAuthCookieName(storeId));
  }

  return extractCookieValue(rawCookieHeader, getAuthCookieName(kind));
}
