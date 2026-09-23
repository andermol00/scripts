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
- **Generador de userscript**: construye la cabecera `==UserScript==` (incluidos
  `@updateURL` y `@downloadURL`) y el cuerpo, con **tres niveles de ofuscación**:
  - `none` → código legible (ideal para revisar).
  - `basic` → XOR + Base64 con auto-decodificador.
  - `strong` → XOR con clave rotatoria + inversión de bytes + Base64 +
    permutación de fragmentos + identificadores hexadecimales.

  Los tres niveles se validaron ejecutando el resultado (incluidos acentos/UTF-8
  y payloads de varios KB). Endpoints: `POST /api/scripts/:id/generate` con
  `{ "level": "none" | "basic" | "strong" }`, `GET /api/scripts/:id/raw?level=…`
  y `POST /api/tools/obfuscate` (ofuscador rápido que no guarda nada).
- **Validación con zod** (`src/lib/validation.ts`): `scriptInputSchema`,
  `generateSchema` y `obfuscateToolSchema`.
- **Copiar / Descargar** el `.user.js` con un clic.

## Desarrollo local

```bash
cp .env.example .env      # ajusta DATABASE_URL y SESSION_SECRET
npm install
node scripts/init-db.mjs  # crea las tablas (idempotente)
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

## Solución de problemas en Render

### `Module not found: Can't resolve 'jose'`

Este error **no pertenece a esta versión del código**. Significa que el repo que
subiste a GitHub contiene archivos de una versión anterior, por ejemplo:

```
src/lib/session.ts            → import { SignJWT, jwtVerify } from "jose"
src/lib/auth-guard.ts
src/app/(app)/layout.tsx
src/app/api/tools/obfuscate/route.ts
```

Ninguno de esos archivos existe aquí: la versión actual **no usa `jose`**, las
sesiones se firman con `node:crypto` (HMAC-SHA256) y se guardan en PostgreSQL.

Tienes dos opciones:

**Opción A — recomendada:** publica esta versión en GitHub. Borra los archivos
viejos de tu repo (o crea uno nuevo) y sube el contenido actual:

```bash
git add -A
git commit -m "Tampervault: versión actual"
git push origin main
```

Render hará redeploy solo (`autoDeploy: true`).

**Opción B:** si prefieres conservar esos archivos, instala la dependencia que
les falta (ya está declarada en este `package.json`, pero si tu repo es otro,
agrégala ahí):

```bash
npm install jose        # o: yarn add jose
```

> Ojo: tu build de Render usó **yarn** porque hay un `yarn.lock` en ese repo.
> Este proyecto usa **npm** y no trae lockfile de yarn. Si dejas un `yarn.lock`
> viejo junto con `package-lock.json`, Render puede instalar versiones
> desincronizadas. Quédate con uno solo.

### `Type error: Type 'string' is not assignable to type 'string[]'`

Ocurre cuando el repo mezcla **dos generaciones** del proyecto: la UI nueva
(`src/app/(app)/…`, `script-editor.tsx`, `script-list-item.tsx`) espera
`matches: string[]`, `grants: string[]`, `updateUrl`, `downloadUrl` y
`obfuscateByDefault`, mientras el schema viejo guardaba `matches`/`grants` como
texto JSON y usaba el booleano `obfuscate`.

En esta versión el modelo de datos ya está **unificado** y coincide con la UI:

```ts
// src/db/schema.ts
matches: text("matches").array().notNull().default([]),
grants: text("grants").array().notNull().default([]),
updateUrl: text("update_url").notNull().default(""),
downloadUrl: text("download_url").notNull().default(""),
obfuscateByDefault: boolean("obfuscate_by_default").notNull().default(false),
```

`scripts/init-db.mjs` **migra automáticamente** las bases de datos que ya tenían
el esquema anterior: convierte el texto JSON a `text[]` (conservando los datos),
copia `obfuscate` → `obfuscate_by_default` y añade las columnas nuevas. Es
idempotente, se puede ejecutar tantas veces como haga falta.

Las API aceptan además `matches`/`grants` como array **o** como string JSON
(retrocompatible con clientes viejos), y aceptan tanto `obfuscateByDefault` como
`obfuscate`.

> Si tu repo aún tiene las dos generaciones, borra los duplicados y quédate con
> una sola UI. Archivos redundantes de la generación anterior:
> `src/components/AuthGate.tsx`, `src/components/Dashboard.tsx`,
> `src/components/ScriptEditor.tsx` (mayúsculas) frente a
> `src/components/auth-gate.tsx`, `script-editor.tsx`, `script-list-item.tsx`
> (minúsculas), y `src/app/page.tsx` frente a `src/app/(app)/page.tsx`
> (dos páginas que resuelven a `/` rompen el build).

### `Type error: Expected 1 arguments, but got 2` en `generate/route.ts`

La ruta `POST /api/scripts/[id]/generate` llama a `buildUserscript(row, level)`,
así que el generador debe aceptar el nivel de ofuscación. En esta versión ya es
así:

```ts
// src/lib/userscript.ts
export function buildUserscript(
  script: Script,
  level?: ObfuscationLevel | string,   // "none" | "basic" | "strong"
): string
```

Si tu repo todavía tiene el `userscript.ts` de un solo argumento, copia los
archivos `src/lib/userscript.ts` y `src/lib/obfuscate.ts` de esta versión.

### `Module not found: Can't resolve 'zod'` (tras borrar `yarn.lock`)

`src/lib/validation.ts` usa **zod**, pero en el repo original esa dependencia
**no estaba declarada** en `package.json`: solo funcionaba porque `yarn.lock` la
arrastraba. Al eliminar el lockfile (o al usar npm) la dependencia desaparece y
el build revienta. Aquí ya está declarada correctamente:

```bash
npm install zod          # o: yarn add zod
```

Regla general: **toda librería importada debe estar en `package.json`**, no solo
en el lockfile.

### `relation "users" does not exist` / health check falla

El build ya ejecuta `node scripts/init-db.mjs`, que crea todas las tablas de
forma idempotente. Si necesitas recrearlas a mano:

```bash
node scripts/init-db.mjs     # sin prompts, seguro de repetir
# o bien
npx drizzle-kit push
```

Asegúrate de que la variable `DATABASE_URL` del servicio apunte a la base de
datos de Render (el Blueprint la enlaza automáticamente).

## Stack

Next.js (App Router) · React · PostgreSQL · Drizzle ORM · Tailwind CSS · `node:crypto`.
