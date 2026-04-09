# Super Admin VPS Production

Esta guia deja operativo el provisioning VPS desde el panel super admin.

## Objetivo

El panel ya puede:
- crear la tienda
- crear owner/admin
- definir theme base
- generar el plan de publicacion
- ejecutar el provisioning VPS

Cloudflare y DNS siguen manuales por ahora.

## Requisitos previos

- El backend productivo corre en la misma VPS que Nginx.
- El usuario que ejecuta backend puede editar:
  - el `.env` del backend
  - el `.env.local` del storefront
  - el archivo del site de Nginx
- El usuario que ejecuta backend puede correr sin password:
  - `nginx -t`
  - `systemctl reload nginx`
  - `certbot certonly ...`
- Existe el script:
  - `/var/www/ecommerce/deploy.sh`

## Variables de entorno

En el backend productivo definir:

```env
SYSTEM_VPS_AUTOMATION_ENABLED=true
SYSTEM_VPS_IP=187.127.13.225
SYSTEM_DEPLOY_SCRIPT_PATH=/var/www/ecommerce/deploy.sh
SYSTEM_STOREFRONT_ENV_PATH=/var/www/ecommerce/ecommerce-storefront/.env.local
SYSTEM_BACKEND_ENV_PATH=/var/www/ecommerce/ecommerce-backend/.env
SYSTEM_NGINX_SITE_PATH=/etc/nginx/sites-available/ecommerce
SYSTEM_NGINX_PROXY_TARGET=http://127.0.0.1:3001
SYSTEM_PRIVILEGED_COMMAND_PREFIX=sudo
SYSTEM_CERTBOT_ENABLED=true
SYSTEM_CERTBOT_WEBROOT=/var/www/html
```

Si preferis no emitir SSL desde el panel:

```env
SYSTEM_CERTBOT_ENABLED=false
```

## Sudoers recomendado

Si el backend corre como `mati`, agregar una regla de sudoers para no pedir password.

Crear archivo:

```bash
sudo visudo -f /etc/sudoers.d/ecommerce-super-admin
```

Contenido sugerido:

```sudoers
mati ALL=(root) NOPASSWD: /usr/sbin/nginx, /bin/systemctl reload nginx, /usr/bin/certbot
```

Si el path real de `nginx`, `systemctl` o `certbot` difiere, usar `which nginx`, `which systemctl`, `which certbot`.

## Flujo operativo

1. Crear la tienda desde el super admin.
2. Configurar DNS manual en Cloudflare:
   - `A @ -> 187.127.13.225`
   - `A www -> 187.127.13.225`
   - SSL/TLS en `Full (strict)`
3. Abrir la tienda en la seccion `Tiendas`.
4. Revisar el bloque `Provisioning VPS`.
5. Ejecutar `Ejecutar provisioning VPS`.

## Que hace el provisioning

- agrega `domain=storeId` en `NEXT_PUBLIC_STORE_HOST_MAP`
- agrega origins en `CORS_ORIGINS`
- inserta o reemplaza un bloque administrado de Nginx
- valida Nginx
- recarga Nginx
- emite/renueva certificado si Certbot esta habilitado
- reemplaza el bloque HTTP inicial por el bloque HTTPS final
- ejecuta `deploy.sh`

## Marcadores usados en Nginx

Cada tienda provisionada queda envuelta con:

```txt
# BEGIN CODEX STORE <storeId>
...
# END CODEX STORE <storeId>
```

Eso permite volver a ejecutar el provisioning sin duplicar bloques.

## Riesgos y limites actuales

- DNS no se crea desde el panel
- el backend necesita permisos reales sobre archivos del sistema
- si `deploy.sh` falla, el panel no hace rollback automatico todavia
- si el cert no puede emitirse porque el DNS no esta bien, el provisioning va a fallar

## Prueba minima despues del deploy

```bash
curl -s -H "x-store-host: midominio.com" http://127.0.0.1:3000/api/store/config
curl -I https://midominio.com
curl -I https://www.midominio.com
```

Esperado:
- `store/config` devuelve la tienda correcta
- ambas URLs publicas responden `200` o un redirect normal a la version canonica
