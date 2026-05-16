# Ecommerce Workspace

Workspace con un ecommerce headless en desarrollo, separado en backend NestJS y storefront Next.js.

## Estructura

- `ecommerce-backend`: API principal, checkout, pagos, envios, fulfillment, webhooks y Prisma.
- `ecommerce-storefront`: storefront publico con soporte multi-tienda por host.
- `ecommerce-admin`: carpeta reservada para un admin separado. Hoy no es una app ejecutable completa.
- `packages`: paquetes compartidos en preparacion.
- `infrastructure`: espacio para IaC y despliegue.

## Estado actual

- Backend compila y responde en `http://localhost:3000`.
- Storefront compila y responde en `http://localhost:3001`.
- Redis es requerido para BullMQ.
- Postgres es requerido para Prisma.
- La segunda tienda local esta preparada por host mapping, pero no necesariamente con un segundo proceso corriendo en `localhost:3002`.

## Puesta en marcha rapida

1. Instalar dependencias en cada app:

```powershell
cd ecommerce-backend
npm install

cd ..\ecommerce-storefront
npm install
```

2. Configurar variables de entorno:

- Backend: copiar `ecommerce-backend/.env.example` a `ecommerce-backend/.env`
- Storefront: copiar `ecommerce-storefront/.env.example` a `ecommerce-storefront/.env.local`

3. Levantar infraestructura local:

- Postgres con una base accesible por `DATABASE_URL`
- Redis en `REDIS_HOST` y `REDIS_PORT`

4. Preparar la base:

```powershell
cd ecommerce-backend
npx prisma migrate deploy
npx prisma db seed
```

Si estas desarrollando cambios de esquema localmente, podes usar `npx prisma migrate dev` en lugar de `migrate deploy`.

5. Levantar todo junto desde la raiz:

```powershell
npm run dev:up
```

Comandos utiles:

```powershell
npm run dev:status
npm run dev:down
```

Si preferis levantar cada servicio por separado:

6. Levantar backend:

```powershell
cd ecommerce-backend
npm run start:dev
```

7. Levantar storefront:

```powershell
cd ecommerce-storefront
npm run dev:store1
npm run dev:store2
```

## Credenciales seed

- Admin demo: `admin@demo.com`
- Password: `admin123`
- Admin tienda 2: `admin-store2@demo.com`
- Password tienda 2: `admin123`

## Hosts de desarrollo

- `localhost:3001` -> tienda 1
- `127.0.0.1:3001` -> tienda 1
- `localhost:3002` -> tienda 2
- `127.0.0.1:3002` -> tienda 2
- `localhost:3007` -> tienda 7
- `127.0.0.1:3007` -> tienda 7

Esto se configura desde `NEXT_PUBLIC_STORE_HOST_MAP`.

## Smoke tests utiles

Backend:

```powershell
cd ecommerce-backend
npm run test:ecommerce
npm run test:race
npm run test:load
npm run test:webhooks
```

Builds:

```powershell
cd ecommerce-backend
npm run build

cd ..\ecommerce-storefront
npm run lint
npm run build
```

## Observaciones

- `dist` y `uploads` no deberian versionarse como fuente de verdad.
- El admin separado todavia no esta armado como aplicacion standalone.
- El storefront depende de `NEXT_PUBLIC_API_URL` y del mapping de hosts para resolver la tienda.
