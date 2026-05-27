import { join } from 'path';

function readString(name: string, fallback?: string) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

function readBoolean(name: string, fallback: boolean) {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value);
}

function readNumber(name: string, fallback: number) {
  const value = process.env[name]?.trim();

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readStringList(name: string, fallback: string[] = []) {
  const value = process.env[name]?.trim();

  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const runtimeConfig = {
  port: readNumber('PORT', 3000),
  appUrl: readString('APP_URL', 'http://localhost:3000')!,
  apiPrefix: readString('API_PREFIX', 'api')!,
  docsPath: readString('DOCS_PATH', 'docs')!,
  docsEnabled: readBoolean('DOCS_ENABLED', true),
  corsOrigins: readStringList('CORS_ORIGINS'),
  mercadoPagoWebhookSecret: readString('MERCADOPAGO_WEBHOOK_SECRET'),
  redisHost: readString('REDIS_HOST', '127.0.0.1')!,
  redisPort: readNumber('REDIS_PORT', 6379),
  uploadsDir: readString('UPLOADS_DIR', join(process.cwd(), 'uploads'))!,
  privateUploadsDir: readString(
    'PRIVATE_UPLOADS_DIR',
    join(process.cwd(), 'private-uploads'),
  )!,
  authCookieName: readString('AUTH_COOKIE_NAME', 'ecommerce_session')!,
  systemAuthCookieName: readString(
    'SYSTEM_AUTH_COOKIE_NAME',
    'ecommerce_system_session',
  )!,
  authCookieDomain: readString('AUTH_COOKIE_DOMAIN'),
  authCookieSecure: readBoolean('AUTH_COOKIE_SECURE', false),
  authCookieSameSite: readString('AUTH_COOKIE_SAME_SITE', 'lax')!,
  googleClientIds: readStringList(
    'GOOGLE_CLIENT_IDS',
    readString('GOOGLE_CLIENT_ID') ? [readString('GOOGLE_CLIENT_ID')!] : [],
  ),
  rateLimitWindowMs: readNumber('RATE_LIMIT_WINDOW_MS', 60_000),
  authRateLimitMax: readNumber('AUTH_RATE_LIMIT_MAX', 10),
  webhookRateLimitMax: readNumber('WEBHOOK_RATE_LIMIT_MAX', 120),
  labelsMaxPdfLabels: readNumber('LABELS_MAX_PDF_LABELS', 1000),
  systemVpsAutomationEnabled: readBoolean(
    'SYSTEM_VPS_AUTOMATION_ENABLED',
    false,
  ),
  systemVpsIp: readString('SYSTEM_VPS_IP'),
  systemDeployScriptPath: readString('SYSTEM_DEPLOY_SCRIPT_PATH'),
  systemStorefrontEnvPath: readString('SYSTEM_STOREFRONT_ENV_PATH'),
  systemBackendEnvPath: readString('SYSTEM_BACKEND_ENV_PATH'),
  systemNginxSitePath: readString('SYSTEM_NGINX_SITE_PATH'),
  systemNginxProxyTarget: readString(
    'SYSTEM_NGINX_PROXY_TARGET',
    'http://127.0.0.1:3001',
  )!,
  systemPrivilegedCommandPrefix: readString(
    'SYSTEM_PRIVILEGED_COMMAND_PREFIX',
    '',
  )!,
  systemCertbotEnabled: readBoolean('SYSTEM_CERTBOT_ENABLED', false),
  systemCertbotWebroot: readString('SYSTEM_CERTBOT_WEBROOT', '/var/www/html')!,
};
