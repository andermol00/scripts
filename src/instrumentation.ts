/**
 * Runs once when the Next.js server boots (dev and production).
 * Guarantees the database tables exist before any request is served, so a
 * fresh Render deployment needs no manual `drizzle-kit push`.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { ensureSchema } = await import("./db/bootstrap");
      await ensureSchema();
    } catch (error) {
      console.error("[instrumentation] schema bootstrap failed:", error);
    }
  }
}
