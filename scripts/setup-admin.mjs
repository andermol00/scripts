#!/usr/bin/env node
/**
 * Generates ultra-secure admin credentials for Tampermonkey Vault.
 *
 * Usage:
 *   node scripts/setup-admin.mjs [username] [password]
 *
 * If no password is provided, a strong random one is generated for you.
 * The script prints the environment variables you must set (locally in
 * `.env`, or in your Render.com service's Environment settings). Nothing
 * is written to disk automatically — copy the values yourself so they are
 * never accidentally committed to git.
 */
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";

const [, , argUsername, argPassword] = process.argv;

const username = argUsername?.trim() || "admin";

function generateStrongPassword(length = 24) {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*()-_=+";
  const bytes = crypto.randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += alphabet[bytes[i] % alphabet.length];
  }
  return password;
}

async function main() {
  const password = argPassword?.trim() || generateStrongPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  const totpSecret = authenticator.generateSecret();
  const authSecret = crypto.randomBytes(48).toString("base64url");
  const otpAuthUrl = authenticator.keyuri(username, "TamperVault", totpSecret);

  console.log("\n===========================================================");
  console.log(" Tampermonkey Vault — credenciales de administrador");
  console.log("===========================================================\n");

  console.log("Añade estas variables de entorno a tu `.env` (local) o a las");
  console.log("variables de entorno del servicio en Render.com:\n");

  console.log(`ADMIN_USERNAME=${username}`);
  console.log(`ADMIN_PASSWORD_HASH=${passwordHash}`);
  console.log(`ADMIN_TOTP_SECRET=${totpSecret}`);
  console.log(`AUTH_SECRET=${authSecret}`);

  if (!argPassword) {
    console.log("\n-----------------------------------------------------------");
    console.log(` Contraseña generada (guárdala en un gestor de contraseñas,`);
    console.log(` NO se puede recuperar más adelante):\n`);
    console.log(`   ${password}`);
    console.log("-----------------------------------------------------------");
  }

  console.log("\nConfigura tu app de autenticación (Google Authenticator, Authy,");
  console.log("1Password, etc.) escaneando este código QR o usando la URL:\n");
  console.log(otpAuthUrl + "\n");

  try {
    const qr = await QRCode.toString(otpAuthUrl, { type: "terminal", small: true });
    console.log(qr);
  } catch {
    console.log("(No se pudo dibujar el QR en esta terminal, usa la URL de arriba.)");
  }

  console.log("Una vez configuradas las variables de entorno, reinicia el servidor");
  console.log("y entra en /login con el usuario, la contraseña y el código de 6");
  console.log("dígitos de tu app de autenticación.\n");
}

main().catch((error) => {
  console.error("Error generando credenciales:", error);
  process.exit(1);
});
