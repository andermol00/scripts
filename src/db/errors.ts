export type DatabaseErrorInfo = {
  code:
    | "DATABASE_NOT_CONFIGURED"
    | "DATABASE_AUTH_FAILED"
    | "DATABASE_UNREACHABLE"
    | "DATABASE_SCHEMA_FAILED";
  message: string;
};

type ErrorLike = Error & {
  code?: string;
  cause?: unknown;
};

/** Map low-level pg errors to safe messages (never expose credentials/URLs). */
export function describeDatabaseError(error: unknown): DatabaseErrorInfo {
  const e = error as ErrorLike | null;
  const code = String(e?.code ?? "");
  const message = String(e?.message ?? "").toLowerCase();

  if (message.includes("database_url") || message.includes("connectionstring")) {
    return {
      code: "DATABASE_NOT_CONFIGURED",
      message:
        "La variable DATABASE_URL no está configurada en el servicio de Render.",
    };
  }

  if (code === "28P01" || code === "28000" || message.includes("password authentication")) {
    return {
      code: "DATABASE_AUTH_FAILED",
      message:
        "PostgreSQL rechazó las credenciales. Revisa que DATABASE_URL sea la URL vigente de Render.",
    };
  }

  if (
    ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN", "57P03"].includes(
      code,
    ) ||
    message.includes("timeout") ||
    message.includes("connect") ||
    message.includes("ssl") ||
    message.includes("certificate")
  ) {
    return {
      code: "DATABASE_UNREACHABLE",
      message:
        "No se pudo conectar a PostgreSQL. Comprueba DATABASE_URL, la región y el estado de la base de datos.",
    };
  }

  return {
    code: "DATABASE_SCHEMA_FAILED",
    message:
      "La base de datos respondió, pero no se pudo crear o verificar el esquema. Revisa los logs de Render.",
  };
}
