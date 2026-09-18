"use server";

import { timingSafeEqual } from "crypto";
import { and, count, eq, gte } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { authEvents, savedScripts, users } from "@/db/schema";
import {
  assertSameOrigin,
  createSession,
  destroySession,
  getCurrentUser,
  getRequestIp,
  hashPassword,
  normalizeEmail,
  secureHash,
  validatePassword,
  verifyPassword,
} from "@/lib/auth";
import { buildTampermonkeyOutput } from "@/lib/script-builder";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_EMAIL_ATTEMPTS = 5;
const MAX_IP_ATTEMPTS = 15;

function toErrorPath(path: string, message: string) {
  return `${path}?error=${encodeURIComponent(message)}`;
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function safeSecretMatch(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);
  return inputBuffer.length === expectedBuffer.length && timingSafeEqual(inputBuffer, expectedBuffer);
}

async function authHashes(email: string) {
  const ip = await getRequestIp();
  return {
    principalHash: secureHash(`principal:${email}`),
    ipHash: secureHash(`ip:${ip}`),
  };
}

async function tooManyLoginAttempts(principalHash: string, ipHash: string) {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);
  const [byEmail, byIp] = await Promise.all([
    db
      .select({ total: count() })
      .from(authEvents)
      .where(
        and(
          eq(authEvents.principalHash, principalHash),
          eq(authEvents.eventType, "login_failure"),
          gte(authEvents.createdAt, since),
        ),
      ),
    db
      .select({ total: count() })
      .from(authEvents)
      .where(
        and(
          eq(authEvents.ipHash, ipHash),
          eq(authEvents.eventType, "login_failure"),
          gte(authEvents.createdAt, since),
        ),
      ),
  ]);

  return Number(byEmail[0]?.total ?? 0) >= MAX_EMAIL_ATTEMPTS || Number(byIp[0]?.total ?? 0) >= MAX_IP_ATTEMPTS;
}

async function recordFailedLogin(principalHash: string, ipHash: string) {
  await db.insert(authEvents).values({
    principalHash,
    ipHash,
    eventType: "login_failure",
  });
}

async function requireAuthenticatedUser() {
  await assertSameOrigin();
  const user = await getCurrentUser();
  if (!user) redirect(toErrorPath("/", "Tu sesión ya no es válida. Inicia sesión de nuevo."));
  return user;
}

export async function loginAction(formData: FormData) {
  await assertSameOrigin();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!validEmail(email) || !password) {
    redirect(toErrorPath("/", "Revisa tu correo y contraseña."));
  }

  const { principalHash, ipHash } = await authHashes(email);
  if (await tooManyLoginAttempts(principalHash, ipHash)) {
    redirect(toErrorPath("/", "Demasiados intentos. Espera 15 minutos antes de intentarlo otra vez."));
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const isValid = user
    ? await verifyPassword(password, user.passwordSalt, user.passwordHash)
    : await verifyPassword(password, "timing-equalization-salt", "0".repeat(128));

  if (!user || !isValid) {
    await recordFailedLogin(principalHash, ipHash);
    redirect(toErrorPath("/", "Correo o contraseña incorrectos."));
  }

  await db
    .delete(authEvents)
    .where(and(eq(authEvents.principalHash, principalHash), eq(authEvents.eventType, "login_failure")));
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await createSession(user.id);
  redirect("/dashboard");
}

export async function registerAction(formData: FormData) {
  await assertSameOrigin();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const enrollmentCode = String(formData.get("enrollmentCode") ?? "");

  if (!validEmail(email) || displayName.length < 2 || displayName.length > 80) {
    redirect(toErrorPath("/register", "Indica un nombre y correo válidos."));
  }
  const passwordProblem = validatePassword(password);
  if (passwordProblem) redirect(toErrorPath("/register", passwordProblem));
  if (password !== confirmPassword) redirect(toErrorPath("/register", "Las contraseñas no coinciden."));

  const [{ total }] = await db.select({ total: count() }).from(users);
  const hasUsers = Number(total) > 0;
  const configuredCode = process.env.REGISTRATION_SECRET;
  const codeAccepted = configuredCode ? safeSecretMatch(enrollmentCode, configuredCode) : !hasUsers;

  if (!codeAccepted) {
    redirect(
      toErrorPath(
        "/register",
        hasUsers
          ? "El registro está cerrado. Solicita una clave de alta al administrador."
          : "La clave de alta no es correcta.",
      ),
    );
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) redirect(toErrorPath("/register", "No se pudo crear la cuenta con esos datos."));

  const { hash, salt } = await hashPassword(password);
  const [createdUser] = await db
    .insert(users)
    .values({ email, displayName, passwordHash: hash, passwordSalt: salt })
    .returning({ id: users.id });

  await createSession(createdUser.id);
  redirect("/dashboard?notice=Cuenta%20protegida%20creada%20correctamente.");
}

export async function logoutAction() {
  await assertSameOrigin();
  await destroySession();
  redirect("/");
}

export async function saveScriptAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const sourceCode = String(formData.get("sourceCode") ?? "").replace(/\r\n/g, "\n");
  const isObfuscated = formData.get("isObfuscated") === "on";

  if (title.length < 2 || title.length > 100) {
    redirect(toErrorPath("/dashboard", "El título debe tener entre 2 y 100 caracteres."));
  }
  if (description.length > 300) {
    redirect(toErrorPath("/dashboard", "La descripción no puede superar 300 caracteres."));
  }
  if (sourceCode.trim().length < 1 || sourceCode.length > 250_000) {
    redirect(toErrorPath("/dashboard", "El código debe contener entre 1 y 250.000 caracteres."));
  }

  const outputCode = buildTampermonkeyOutput(sourceCode, title, isObfuscated);
  await db.insert(savedScripts).values({
    ownerId: user.id,
    title,
    description,
    sourceCode,
    outputCode,
    isObfuscated,
  });

  redirect("/dashboard?notice=Script%20generado%20y%20guardado%20en%20tu%20b%C3%B3veda.");
}

export async function deleteScriptAction(formData: FormData) {
  const user = await requireAuthenticatedUser();
  const scriptId = String(formData.get("scriptId") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(scriptId)) {
    redirect(toErrorPath("/dashboard", "Script no válido."));
  }

  await db
    .delete(savedScripts)
    .where(and(eq(savedScripts.id, scriptId), eq(savedScripts.ownerId, user.id)));
  redirect("/dashboard?notice=Script%20eliminado.");
}
