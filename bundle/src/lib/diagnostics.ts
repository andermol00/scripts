import { sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "@/db";

export type DbStatus = {
  configured: boolean;
  reachable: boolean;
  error?: string;
  hint?: string;
};

/**
 * Comprueba si la app puede hablar con Postgres. Se usa para devolver errores
 * accionables en vez de un 500 genérico cuando falta DATABASE_URL en Vercel.
 */
export async function getDbStatus(): Promise<DbStatus> {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      reachable: false,
      error: "DATABASE_URL no está definida",
      hint: "Añádela en Vercel → Settings → Environment Variables y vuelve a desplegar.",
    };
  }

  try {
    await db.execute(sql`select 1`);
    return { configured: true, reachable: true };
  } catch (error) {
    const message = (error as Error).message || "Error desconocido";
    const hint = /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|timeout/i.test(message)
      ? "El host de la base de datos no responde. Revisa la URL y que la IP de Vercel tenga acceso."
      : /password|authentication|SASL/i.test(message)
        ? "Credenciales rechazadas. Verifica usuario y contraseña en DATABASE_URL."
        : /does not exist|no existe/i.test(message)
          ? "La base de datos indicada no existe. Crea el schema o corrige el nombre."
          : "Revisa el formato: postgresql://usuario:password@host:5432/dbname";

    return { configured: true, reachable: false, error: message, hint };
  }
}
