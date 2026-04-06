import type { Response } from 'express';
import { runtimeConfig } from '../../../config/runtime-config';

const supportedSameSite = new Set(['lax', 'strict', 'none']);

function normalizeSameSite() {
  const value = runtimeConfig.authCookieSameSite.toLowerCase();
  return supportedSameSite.has(value) ? value : 'lax';
}

export function getAuthCookieName() {
  return runtimeConfig.authCookieName;
}

export function setAuthCookie(response: Response, token: string) {
  response.cookie(getAuthCookieName(), token, {
    httpOnly: true,
    secure: runtimeConfig.authCookieSecure,
    sameSite: normalizeSameSite() as 'lax' | 'strict' | 'none',
    domain: runtimeConfig.authCookieDomain,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(response: Response) {
  response.clearCookie(getAuthCookieName(), {
    httpOnly: true,
    secure: runtimeConfig.authCookieSecure,
    sameSite: normalizeSameSite() as 'lax' | 'strict' | 'none',
    domain: runtimeConfig.authCookieDomain,
    path: '/',
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
