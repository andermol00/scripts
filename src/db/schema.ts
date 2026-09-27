import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // PIN de 6 dígitos en hash (scrypt)
  pinHash: text("pin_hash"),
  totpSecret: text("totp_secret"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pinAttempts = pgTable(
  "pin_attempts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ip: text("ip").notNull(),
    attempts: integer("attempts").notNull().default(0), // contador de intentos
    lockedUntil: timestamp("locked_until"), // bloqueo después de 3 intentos
    passwordRequiredAt: timestamp("password_required_at"), // pedir contraseña en 5 min
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdIdx: index("pin_attempts_user_id_idx").on(t.userId),
    ipIdx: index("pin_attempts_ip_idx").on(t.ip),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userAgent: text("user_agent"),
    ip: text("ip"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    tokenIdx: index("sessions_token_idx").on(t.tokenHash),
  }),
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    ip: text("ip").notNull().default(""),
    username: text("username"),
    success: boolean("success").notNull().default(false),
    identifier: text("identifier"),
    attempts: integer("attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until"),
    lastAttemptAt: timestamp("last_attempt_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    ipIdx: index("login_attempts_ip_idx").on(t.ip),
    identifierIdx: index("login_attempts_identifier_idx").on(t.identifier),
  }),
);

export const loginEvents = pgTable(
  "login_events",
  {
    id: serial("id").primaryKey(),
    identifier: text("identifier").notNull(),
    success: boolean("success").notNull().default(false),
    reason: text("reason").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    identifierIdx: index("login_events_identifier_idx").on(t.identifier),
  }),
);

export const scripts = pgTable("scripts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  namespace: text("namespace").notNull().default("http://tampermonkey.net/"),
  version: text("version").notNull().default("1.0.0"),
  description: text("description").notNull().default(""),
  author: text("author").notNull().default(""),
  matches: text("matches").array().notNull().default([]),
  grants: text("grants").array().notNull().default([]),
  runAt: text("run_at").notNull().default("document-idle"),
  updateUrl: text("update_url").notNull().default(""),
  downloadUrl: text("download_url").notNull().default(""),
  code: text("code").notNull().default(""),
  obfuscateByDefault: boolean("obfuscate_by_default").notNull().default(false),
  // NUEVO: hash del código para detectar cambios
  codeHash: text("code_hash").notNull().default(""),
  // NUEVO: URL de origen (si es externa)
  sourceUrl: text("source_url"),
  // NUEVO: última vez que se verificó actualización
  lastCheckAt: timestamp("last_check_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Script = typeof scripts.$inferSelect;
export type PinAttempt = typeof pinAttempts.$inferSelect;
