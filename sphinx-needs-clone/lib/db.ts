import 'server-only'

import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { join } from 'path'

const DB_DIR = join(process.cwd(), '.data')
const DB_PATH = join(DB_DIR, 'db.sqlite')

// Ensure the .data/ directory exists before opening the database.
// Required on fresh clone before any `npm run dev` has been run.
mkdirSync(DB_DIR, { recursive: true })

// Dev hot-reload guard: Next.js HMR can re-evaluate this module on each
// save. Storing the instance on globalThis ensures we reuse the same
// connection across hot reloads in development.
const globalForDb = globalThis as typeof globalThis & {
  _db?: Database.Database
}

if (!globalForDb._db) {
  const db = new Database(DB_PATH)

  // Enable foreign key enforcement — SQLite disables FKs by default (AD-10)
  db.pragma('foreign_keys = ON')

  // Create all tables idempotently on every process start (AD-8)
  db.exec(`
    CREATE TABLE IF NOT EXISTS need_type (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      name   TEXT    NOT NULL,
      prefix TEXT    NOT NULL UNIQUE,
      color  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS status_value (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      value TEXT    NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS need (
      id          TEXT    PRIMARY KEY,
      type_id     INTEGER NOT NULL REFERENCES need_type(id) ON DELETE RESTRICT,
      title       TEXT    NOT NULL,
      status      TEXT    NOT NULL,
      tags        TEXT,
      description TEXT,
      seq         INTEGER NOT NULL,
      created_at  TEXT    NOT NULL,
      updated_at  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS need_link (
      from_id TEXT NOT NULL REFERENCES need(id),
      to_id   TEXT NOT NULL REFERENCES need(id),
      PRIMARY KEY (from_id, to_id),
      CHECK (from_id != to_id)
    );
  `)

  // Seed the mandatory default status (AD-9).
  // INSERT OR IGNORE is idempotent — safe to run on every startup.
  db.prepare(`INSERT OR IGNORE INTO status_value (value) VALUES ('open')`).run()

  globalForDb._db = db
}

export default globalForDb._db as Database.Database
