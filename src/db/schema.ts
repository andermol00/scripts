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

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    ip: text("ip").notNull(),
    username: text("username"),
    success: boolean("success").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    ipIdx: index("login_attempts_ip_idx").on(t.ip),
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
  // JSON-encoded array of @match patterns
  matches: text("matches").notNull().default("[]"),
  // JSON-encoded array of @grant values
  grants: text("grants").notNull().default("[]"),
  runAt: text("run_at").notNull().default("document-idle"),
  code: text("code").notNull().default(""),
  obfuscate: boolean("obfuscate").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Script = typeof scripts.$inferSelect;
