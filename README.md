# 🔒 Tampermonkey Vault

Bóveda privada para **guardar tus userscripts de Tampermonkey** y **generar
versiones ofuscadas o limpias** listas para instalar. Protegida con un login
ultra seguro (contraseña con hash bcrypt + doble factor TOTP + bloqueo por
intentos fallidos).

Construida con **Next.js (App Router) + PostgreSQL (Drizzle ORM)**. Lista para
desplegar en **Render.com** desde **GitHub**.

---

## ✨ Funciones

- **Guardar scripts**: nombre, descripción, versión, autor, `@match`, `@grant`,
  `@run-at`, URLs de update/download y el código.
- **Generar `.user.js` para Tampermonkey** con la cabecera de metadatos
  automática. Eliges el nivel:
  - **Sin ofuscar** (código legible, un simple check) ✅
  - **Ofuscación básica** (renombra variables, codifica cadenas)
  - **Ofuscación fuerte** (control de flujo, código señuelo, auto-defensa)
- **Ofuscador rápido**: pega cualquier JS y ofúscalo al vuelo, con un check
  para activar/desactivar la ofuscación.
- **Copiar** al portapapeles o **descargar** el archivo `.user.js`.

## 🛡️ Seguridad del login

- Contraseña almacenada como **hash bcrypt** (nunca en texto plano).
- **Doble factor TOTP** (Google Authenticator, Authy, 1Password…).
- **Bloqueo progresivo** por IP+usuario tras varios intentos fallidos
  (persistido en la base de datos, sobrevive a reinicios).
- Sesiones firmadas con **JWT (HS256)** en cookie `httpOnly` + `secure`.
- **Defensa en profundidad**: cada página protegida y cada endpoint API
  vuelven a verificar la sesión en el servidor (no dependen solo del proxy),
  mitigando bypasses tipo CVE-2025-29927.
- Cabeceras de seguridad (HSTS, X-Frame-Options, nosniff, etc.).

---

## 🚀 Puesta en marcha local

```bash
npm install

# 1. Genera tus credenciales de administrador
node scripts/setup-admin.mjs
# (opcional) node scripts/setup-admin.mjs miusuario "MiContraseñaSúperLarga"

# 2. Copia las 4 variables que imprime (ADMIN_USERNAME, ADMIN_PASSWORD_HASH,
#    ADMIN_TOTP_SECRET, AUTH_SECRET) a tu archivo .env
cp .env.example .env   # y edítalo

# 3. Escanea el QR (o la URL otpauth://) con tu app de autenticación

# 4. Crea las tablas
npx drizzle-kit push

# 5. Arranca
npm run dev
```

Entra en `http://localhost:3000/login` con tu usuario, contraseña y el código
de 6 dígitos de la app de autenticación.

---

## ☁️ Despliegue en Render.com desde GitHub

Este repo incluye un **`render.yaml`** (blueprint) que crea el servicio web y
la base de datos automáticamente y evita el error típico de que Render intente
compilar el proyecto como **Ruby** (`Could not locate Gemfile`).

### Pasos

1. Sube el proyecto a un repositorio de GitHub.
   > ⚠️ Asegúrate de que tu `.env` **NO** se sube (ya está en `.gitignore`).

2. En Render pulsa **New +** → **Blueprint** y conecta tu repositorio.
   Render leerá `render.yaml` y creará:
   - un **Web Service** de tipo **Node** (build + start correctos), y
   - una base de datos **PostgreSQL**.

3. Genera tus credenciales en tu máquina:
   ```bash
   node scripts/setup-admin.mjs
   ```
   y en el panel de Render, dentro del servicio → **Environment**, añade:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD_HASH`
   - `ADMIN_TOTP_SECRET`
   - `AUTH_SECRET`

   (`DATABASE_URL` se rellena sola desde la base de datos del blueprint.)

4. Guarda y deja que Render despliegue. El `buildCommand` ya:
   - instala dependencias (incluidas las de desarrollo),
   - crea las tablas (`drizzle-kit push`),
   - y compila la app (`next build`).

5. El healthcheck de Render apunta a `/api/health`.

### ¿Ya creaste el servicio como "Ruby" por error?

Si te salió el error `Could not locate Gemfile`, es porque el servicio se creó
con el runtime equivocado. Bórralo y vuelve a crearlo con **Blueprint** (usando
este `render.yaml`), o edita el servicio existente y cambia manualmente:

- **Language / Runtime**: `Node`
- **Build Command**: `npm install --include=dev && npx drizzle-kit push --force && npm run build`
- **Start Command**: `npm run start`
- **Health Check Path**: `/api/health`
- Variables de entorno: las 4 de admin + `DATABASE_URL`.

---

## 🧩 Cómo instalar un script generado en Tampermonkey

1. Genera el `.user.js` (ofuscado o no) desde la página del script.
2. Cópialo o descárgalo.
3. En Tampermonkey → **Crear un nuevo script**, pega el contenido y guarda
   (o abre el archivo `.user.js` descargado, que Tampermonkey detecta como
   instalable).

---

## Scripts útiles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `node scripts/setup-admin.mjs` | Genera credenciales de admin + QR TOTP |
| `npx drizzle-kit push` | Aplica el esquema a la base de datos |
