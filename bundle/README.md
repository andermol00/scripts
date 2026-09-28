# Tampervault

Bóveda privada (Next.js 16 + Drizzle + PostgreSQL) para almacenar, versionar,
sincronizar y distribuir userscripts de Tampermonkey. El acceso se protege con
PIN de 6 dígitos, bloqueo progresivo y recuperación por contraseña.

## Estructura

```
src/
├── app/
│   ├── page.tsx                        # Login con PIN
│   ├── dashboard/page.tsx              # Bóveda (protegida por sesión)
│   └── api/
│       ├── auth/pin/route.ts           # POST login con PIN / recuperación
│       ├── auth/logout/route.ts        # POST cerrar sesión
│       ├── auth/credentials/route.ts   # POST cambiar PIN / contraseña
│       ├── health/route.ts             # GET healthcheck
│       └── scripts/
│           ├── route.ts                # GET lista · POST crear
│           ├── [id]/route.ts           # GET · PATCH · DELETE
│           ├── [id]/download/route.ts  # GET *.user.js (?obfuscate=1)
│           └── check-updates/route.ts  # POST revisar todos · GET ?id=
├── components/{pin-login,script-manager}.tsx
├── db/{schema,index,bootstrap,seed}.ts
└── lib/{auth,session,scripts,obfuscate}.ts
```

## Puesta en marcha

1. `cp .env.example .env` y completa `DATABASE_URL` + `SESSION_SECRET`.
2. `npm install`
3. Crea el esquema: `npm run db:init` (o `npx drizzle-kit push`).
4. Crea el usuario inicial: `npm run db:seed` → usuario `admin`, PIN `123456`,
   contraseña `tampervault` (cámbialos desde el panel).
5. `npm run dev` y abre `http://localhost:3000`.

## Seguridad

- PIN y contraseña se guardan con scrypt (`scrypt$N$salt$hash`).
- Sesiones en base de datos: solo se guarda el SHA-256 del token; la cookie es
  `httpOnly`, `sameSite=lax` y `secure` en producción.
- 3 intentos de PIN por IP → bloqueo de 5 minutos + contraseña obligatoria
  durante 10 minutos. Cada intento queda registrado en `login_events`.
- La API de scripts siempre filtra por `user_id` de la sesión activa.
- La descarga remota bloquea hosts internos y limita la respuesta a 2 MB.

## Despliegue en Vercel

1. Sube el repo a GitHub e impórtalo en Vercel.
2. Añade las variables `DATABASE_URL` y `SESSION_SECRET` (Project → Settings →
   Environment Variables). **Sin `DATABASE_URL` el build falla con
   `DATABASE_URL is required`**: el pool de Postgres se crea de forma perezosa, así
   que el módulo se puede importar durante la recogida de páginas sin conectarse.
3. `vercel.json` solo ejecuta `npm run build`: el esquema se crea solo en el primer
   request (`src/db/bootstrap.ts` → `ensureSchema()`), que es más fiable que hacerlo
   en el build, donde las variables de entorno aún no están disponibles.

### Si el deploy da 404 NOT_FOUND

Significa que el build no llegó a generar la salida. Mira el log de "Collecting page
data": si aparece `DATABASE_URL is required`, repite el paso 2 y vuelve a desplegar.
También puedes ejecutar `npm run db:init` desde tu máquina apuntando a la base de
producción (`DATABASE_URL=... npm run db:init`).
