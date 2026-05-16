# Ecommerce Storefront

Storefront publico del ecommerce, construido con Next.js App Router.

## Que cubre hoy

- Home composable por bloques.
- Catalogo, categoria y detalle de producto.
- Carrito y checkout.
- Login, registro y area de cuenta.
- Workspace administrativo embebido dentro del storefront.
- Resolucion de tienda por host para desarrollo multi-tenant.

## Variables de entorno

Copiar `.env.example` a `.env.local`.

Variables principales:

- `NEXT_PUBLIC_API_URL`: URL base del backend, por ejemplo `http://localhost:3000/api`
- `NEXT_PUBLIC_STORE_HOST_MAP`: mapa `host=storeId` para resolver tenants
- `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`: public key del checkout con Mercado Pago

## Arranque local

1. Instalar dependencias:

```powershell
npm install
```

2. Configurar `.env.local`

3. Levantar desarrollo en el puerto 3001:

```powershell
npm run dev:store1
npm run dev:store2
```

## Hosts de desarrollo

Por defecto:

- `localhost:3001` -> tienda 1
- `127.0.0.1:3001` -> tienda 1
- `localhost:3002` -> tienda 2
- `127.0.0.1:3002` -> tienda 2
- `localhost:3007` -> tienda 7
- `127.0.0.1:3007` -> tienda 7

Si el host no esta mapeado, el storefront ahora falla de forma explicita en lugar de mandar todo a la tienda 1.

## Scripts utiles

- `npm run dev`
- `npm run dev:store1`
- `npm run dev:store2`
- `npm run lint`
- `npm run build`
- `npm run start`

## Integracion local esperada

- Backend corriendo en `http://localhost:3000`
- Storefront corriendo en `http://localhost:3001`
- Host mapping configurado para la tienda que quieras abrir

## Notas

- `NEXT_PUBLIC_API_URL` es obligatoria en produccion.
- En navegador, el storefront proxya las llamadas cliente por `/api/proxy/*` para que la sesion viaje como cookie first-party incluso en mobile y en dominios custom.
- En desarrollo existe fallback local para evitar que el storefront explote temprano si falta esa variable.
- Hoy la home multi-tienda sigue teniendo contenido hardcodeado por tienda en `src/lib/tenant/get-tenant.ts`.
