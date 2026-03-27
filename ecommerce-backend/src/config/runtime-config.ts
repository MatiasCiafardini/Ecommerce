import { join } from 'path';

function readString(name: string, fallback?: string) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

function readNumber(name: string, fallback: number) {
  const value = process.env[name]?.trim();

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const runtimeConfig = {
  port: readNumber('PORT', 3000),
  appUrl: readString('APP_URL', 'http://localhost:3000')!,
  apiPrefix: readString('API_PREFIX', 'api')!,
  docsPath: readString('DOCS_PATH', 'docs')!,
  redisHost: readString('REDIS_HOST', '127.0.0.1')!,
  redisPort: readNumber('REDIS_PORT', 6379),
  uploadsDir: readString('UPLOADS_DIR', join(process.cwd(), 'uploads'))!,
};
