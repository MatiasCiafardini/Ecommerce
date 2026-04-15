# Ecommerce Backend

Backend principal del ecommerce, construido con NestJS, Prisma y BullMQ.

## Que resuelve hoy

- Catalogo: productos, variantes, imagenes, categorias y opciones.
- Clientes: auth, cuentas, direcciones y carrito.
- Checkout: creacion de orden, reserva de stock e idempotencia.
- Pagos: Mercado Pago y transferencia bancaria con comprobante.
- Envios: metodos por tienda, cotizaciones, EnvioPack, Correo Argentino y flujo manual.
- Fulfillment: creacion de envios, tracking y operaciones administrativas.
- Returns y refunds.
- Webhooks y outbox/event bus.

## Requisitos

- Node.js
- Postgres
- Redis

## Variables de entorno

Copiar `.env.example` a `.env`.

Variables principales:

- `DATABASE_URL`: conexion a Postgres.
- `JWT_SECRET`: secreto JWT obligatorio.
- `PORT`: puerto HTTP del backend.
- `APP_URL`: URL publica local, usada para logs y docs.
- `API_PREFIX`: prefijo global de la API. Por defecto `api`.
- `DOCS_PATH`: path de Swagger. Por defecto `docs`.
- `DOCS_ENABLED`: apagar Swagger en produccion. Recomendado `false`.
- `CORS_ORIGINS`: lista separada por comas con storefronts y admin permitidos.
- `REDIS_HOST` y `REDIS_PORT`: conexion BullMQ.
- `UPLOADS_DIR`: carpeta local para comprobantes e imagenes subidas.
- `PRIVATE_UPLOADS_DIR`: carpeta privada para comprobantes sensibles.
- `AUTH_COOKIE_NAME`: nombre de la cookie de sesion.
- `AUTH_COOKIE_DOMAIN`: dominio compartido de la cookie. En produccion suele ser `.tu-dominio.com`.
- `AUTH_COOKIE_SECURE`: usar `true` en HTTPS.
- `AUTH_COOKIE_SAME_SITE`: normalmente `lax` en local y `none` en multisitio HTTPS.
- `RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX`, `WEBHOOK_RATE_LIMIT_MAX`: hardening basico para login y webhooks.
- `MERCADOPAGO_ACCESS_TOKEN`: token del provider.
- Variables de shipping: EnvioPack y Correo Argentino segun el provider activo.
- Email de notificaciones admin y customer:
  - `EMAIL_NOTIFICATIONS_ENABLED`: `true` para activar el envio.
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`: credenciales SMTP.
  - `EMAIL_NOTIFICATIONS_FROM`: remitente visible del correo.
  - `EMAIL_NOTIFICATIONS_FROM_NAME`: nombre visible del remitente.
  - `STOREFRONT_PUBLIC_URL`: opcional. Si no se define, se arma desde el dominio de la tienda.

## Arranque local

1. Instalar dependencias:

```powershell
npm install
```

2. Aplicar migraciones y seed:

```powershell
npx prisma migrate deploy
npx prisma db seed
```

3. Levantar en desarrollo:

```powershell
npm run start:dev
```

## URLs locales por defecto

- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/docs`
- Uploads: `http://localhost:3000/uploads/...`

## Checklist de produccion

Antes de desplegar:

- Copiar `\.env.production.example` a tu entorno real y completar secretos.
- Valores ya acordados para este proyecto:
  - `APP_URL=https://api.estudiosmc.cloud`
  - `CORS_ORIGINS=https://estudiosmc.cloud,https://www.estudiosmc.cloud,https://trojani.com.ar,https://www.trojani.com.ar,https://admin.estudiosmc.cloud`
  - `UPLOADS_DIR=/var/www/ecommerce/shared/uploads`
  - `PRIVATE_UPLOADS_DIR=/var/www/ecommerce/shared/private-uploads`
- `AUTH_COOKIE_DOMAIN=` vacio para soportar multidominio con cookie host-only en `api.estudiosmc.cloud`
  - `AUTH_COOKIE_SECURE=true`
  - `AUTH_COOKIE_SAME_SITE=none`
- Definir `DOCS_ENABLED=false`.
- Definir `CORS_ORIGINS` con los dominios reales del storefront y admin.
- Definir `AUTH_COOKIE_SECURE=true`.
- Definir `AUTH_COOKIE_DOMAIN` si backend, admin y storefront comparten dominio base.
- Si usas dominios custom por tienda o un proxy same-origin desde el storefront, dejar `AUTH_COOKIE_DOMAIN` vacio para evitar cookies invalidas entre sitios distintos.
- Usar `AUTH_COOKIE_SAME_SITE=none` cuando el frontend y la API operen por HTTPS en subdominios distintos.
- Asegurar que `PRIVATE_UPLOADS_DIR` exista y tenga backup y permisos restringidos.
- Confirmar que el proxy inverso preserve cookies, `x-forwarded-host` y HTTPS.

## Scripts utiles

- `npm run start`
- `npm run start:dev`
- `npm run build`
- `npm run test:ecommerce`
- `npm run test:race`
- `npm run test:load`
- `npm run test:webhooks`

## Seed de desarrollo

El seed crea catalogo demo, categorias, stock, clientes base y un admin:

- Email: `admin@demo.com`
- Password: `admin123`
- Email tienda 2: `admin-store2@demo.com`
- Password tienda 2: `admin123`

## Notas operativas

- Redis debe estar disponible antes de levantar el backend.
- `dist` y `uploads` se consideran artefactos locales, no fuente de verdad.
- Los scripts de smoke test usan `BACKEND_API_URL` y `TEST_STORE_ID` si queres apuntar a otro entorno.
- Tambien aceptan `TEST_ADMIN_PASSWORD` si tu base local no coincide con la credencial actual del seed.
