# Script Vault

Bóveda privada para guardar scripts de Tampermonkey y preparar una versión empaquetada o conservar el código original.

## Seguridad incluida

- Contraseñas derivadas con `scrypt` (sal aleatoria por cuenta; nunca se guardan en texto plano).
- Cookies `HttpOnly`, `Secure` en producción y `SameSite=Strict`.
- Tokens de sesión aleatorios de 256 bits; la base de datos almacena únicamente su HMAC.
- Sesiones revocables y con caducidad de 7 días.
- Limitación persistente de intentos de acceso por cuenta e IP (5 / 15 minutos por correo, 15 / 15 minutos por IP).
- Validación de origen en todas las mutaciones y cabeceras de seguridad.
- Cada consulta de scripts se limita estrictamente al usuario autenticado.

> La ofuscación es una capa de entrega, no una medida criptográfica para proteger secretos. Nunca incrustes llaves, tokens o contraseñas en un userscript.

## Ejecutar localmente

1. Copia `.env.example` como `.env` y configura `DATABASE_URL`, `AUTH_SECRET` (mínimo 32 caracteres aleatorios) y `REGISTRATION_SECRET`.
2. Instala dependencias: `npm install`.
3. Crea las tablas: `npx drizzle-kit push`.
4. Arranca el proyecto: `npm run dev`.
5. La primera cuenta inicializa la bóveda. En instalaciones con `REGISTRATION_SECRET`, esa clave es requerida para cada alta posterior.

## Desplegar en Render desde GitHub

1. Sube este repositorio a un repositorio privado de GitHub. El archivo `.gitignore` evita publicar `.env`.
2. En Render selecciona **New +** → **Blueprint** y conecta el repositorio.
3. Render detectará `render.yaml`, creará el servicio web y PostgreSQL, generará `AUTH_SECRET` y `REGISTRATION_SECRET`, aplicará el esquema con Drizzle y configurará `/api/health`.
4. Tras el primer despliegue, consulta en Render el valor de `REGISTRATION_SECRET` solamente si necesitas autorizar cuentas adicionales. Guárdalo en un gestor de contraseñas, no en GitHub.
5. Usa siempre la URL HTTPS de Render. Para cambiar un secreto, rota `AUTH_SECRET` (esto invalida todas las sesiones) y vuelve a desplegar.

El comando de compilación de la Blueprint ejecuta `npx drizzle-kit push` antes de `npm run build`, por lo que los cambios declarados en `src/db/schema.ts` se aplican al desplegar.
