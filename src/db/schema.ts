import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";

// Single-tenant admin auth. Registration is locked after the first user
// is created (see /api/auth/setup).
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  // Format: scrypt$N$salt$hash (all hex/base64)
  passwordHash: text("password_hash").notNull(),
  // Optional TOTP secret (base32) for 2FA
  totpSecret: text("totp_secret"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    // SHA-256 of the raw session token (never store the raw token)
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

/**
 * Supports two complementary strategies:
 *  - simple IP-based counting (ip / username / success / created_at)
 *  - exponential lockout keyed by a hashed ip::username `identifier`
 *    (attempts / locked_until / last_attempt_at)
 * All the extra columns are nullable or defaulted so either writer works.
 */
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    ip: text("ip").notNull().default(""),
    username: text("username"),
    success: boolean("success").notNull().default(false),
    // SHA-256 of `${ip}::${username}` — never store the raw pair.
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

/** Audit trail of every login outcome (used by the rate limiter). */
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
  // Native Postgres arrays of @match patterns / @grant values
  matches: text("matches").array().notNull().default([]),
  grants: text("grants").array().notNull().default([]),
  runAt: text("run_at").notNull().default("document-idle"),
  updateUrl: text("update_url").notNull().default(""),
  downloadUrl: text("download_url").notNull().default(""),
  code: text("code").notNull().default(""),
  // Whether generated output is obfuscated by default
  obfuscateByDefault: boolean("obfuscate_by_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Script = typeof scripts.$inferSelect;
