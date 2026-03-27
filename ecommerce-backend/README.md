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
- `REDIS_HOST` y `REDIS_PORT`: conexion BullMQ.
- `UPLOADS_DIR`: carpeta local para comprobantes e imagenes subidas.
- `MERCADOPAGO_ACCESS_TOKEN`: token del provider.
- Variables de shipping: EnvioPack y Correo Argentino segun el provider activo.

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
