import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Userscripts saved by the admin.
export const scripts = pgTable("scripts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  code: text("code").notNull(),
  namespace: text("namespace").notNull().default("https://tampermonkey.local/"),
  version: text("version").notNull().default("1.0.0"),
  author: text("author").notNull().default(""),
  matches: jsonb("matches").$type<string[]>().notNull().default([]),
  grants: jsonb("grants").$type<string[]>().notNull().default([]),
  runAt: text("run_at").notNull().default("document-idle"),
  updateUrl: text("update_url").notNull().default(""),
  downloadUrl: text("download_url").notNull().default(""),
  obfuscateByDefault: boolean("obfuscate_by_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Persisted brute-force protection: tracks failed login attempts per
// identifier (hashed IP + username) so lockouts survive server restarts.
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    identifier: text("identifier").notNull(),
    attempts: integer("attempts").notNull().default(0),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (table) => [index("login_attempts_identifier_idx").on(table.identifier)],
);

// Audit trail of successful and failed login attempts for visibility.
export const loginEvents = pgTable("login_events", {
  id: serial("id").primaryKey(),
  identifier: text("identifier").notNull(),
  success: boolean("success").notNull(),
  reason: text("reason").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
