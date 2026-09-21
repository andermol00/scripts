# 🔐 Tampervault

Bóveda web para guardar tus **scripts de Tampermonkey** y generar userscripts listos
para instalar — con la opción de **ofuscarlos o dejarlos legibles** (hay un checkbox).
Incluye un **login ultra-seguro** de un solo administrador.

## Características

- **Login blindado**
  - Contraseñas con `scrypt` + sal aleatoria (nunca en texto plano).
  - Cookies de sesión `httpOnly` + `secure` firmadas con HMAC-SHA256.
  - Sesiones almacenadas en base de datos con expiración (12 h).
  - Límite de intentos: 5 fallos por IP cada 15 minutos.
  - Registro bloqueado tras crear el primer administrador (single-tenant).
  - Comparación de contraseñas en tiempo constante (anti timing / enumeración).
- **Gestor de scripts**: crear, editar, eliminar, con metadatos (`@match`, `@grant`,
  `@run-at`, versión, autor, etc.).
- **Pegar un script ya hecho**: pega un `.user.js` completo (o solo el código JS)
  y el importador lee la cabecera `==UserScript==` y rellena nombre, versión,
  `@match`, `@grant`, `@run-at`… automáticamente. Detecta y desenvuelve el
  `IIFE` para no duplicarlo al exportar.
- **Generador de userscript**: construye la cabecera `==UserScript==` y el cuerpo.
  Con el **checkbox de ofuscación** decides si el resultado sale ofuscado o legible.
- **Copiar / Descargar** el `.user.js` con un clic.

## Desarrollo local

```bash
cp .env.example .env      # ajusta DATABASE_URL y SESSION_SECRET
npm install
npx drizzle-kit push      # crea las tablas
npm run dev
```

Abre http://localhost:3000, crea la cuenta de administrador y empieza a guardar scripts.

## Desplegar en Render.com desde GitHub

1. Sube este repositorio a GitHub.
2. En Render, elige **New +** → **Blueprint** y apunta a tu repo.
3. Render leerá `render.yaml`: crea la base de datos PostgreSQL, genera
   `SESSION_SECRET` y conecta `DATABASE_URL` automáticamente.
4. Tras el primer deploy, abre la URL y crea el administrador.

> El healthcheck de Render usa `/api/health`.

Si prefieres configurarlo a mano, crea un servicio Web con:

- **Build**: `npm install && npm run build`
- **Start**: `npm run start`
- Variables: `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production`
- Tras conectar la base de datos, ejecuta `npx drizzle-kit push` una vez.

## Stack

Next.js (App Router) · React · PostgreSQL · Drizzle ORM · Tailwind CSS · `node:crypto`.
