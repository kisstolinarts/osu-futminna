/**
 * Async database engine for OSU FUTMinna.
 *
 * Built on @libsql/client — the same SQLite engine family Turso runs in the
 * cloud — so the SQL is identical whether the app runs on your laptop or on a
 * cloud database. Choose the target with the DATABASE_URL environment variable:
 *
 *   DATABASE_URL=file:/abs/path/osu.db   -> local file (default)
 *   DATABASE_URL=libsql://<db>.turso.io  -> Turso cloud (+ TURSO_AUTH_TOKEN)
 *
 * The API mirrors what the rest of the server expects (prepare/run/get/all,
 * exec, transactions) but is async. Roll-out plan: this module is proven in
 * isolation first, then the route files are switched over file by file.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';
import type { Client, InArgs, Transaction } from '@libsql/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

export interface Statement {
  run(...args: unknown[]): Promise<RunResult>;
  get(...args: unknown[]): Promise<Record<string, unknown> | undefined>;
  all(...args: unknown[]): Promise<Record<string, unknown>[]>;
}

function resolveUrl(): { url: string; authToken?: string } {
  const url = process.env.DATABASE_URL || '';
  if (url.startsWith('libsql://') || url.startsWith('https://') || url.startsWith('wss://') || url.startsWith('ws://') || url.startsWith('http://')) {
    const token = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;
    if (!token) throw new Error(`Remote DATABASE_URL (${url}) requires TURSO_AUTH_TOKEN.`);
    return { url, authToken: token };
  }
  // Local file (default). DATABASE_URL may be 'file:...' or a bare path.
  const dataDir = path.resolve(__dirname, '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const bare = url.startsWith('file:') ? url.slice('file:'.length) : url || 'osu.db';
  const dbPath = path.isAbsolute(bare) ? bare : path.join(dataDir, bare);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  return { url: `file:${dbPath}` };
}

const { url: resolvedUrl, authToken } = resolveUrl();

export const cloud: Client = createClient({ url: resolvedUrl, authToken, intMode: 'number' });

/** Convert better-sqlite3 style positional args into libSQL InArgs. */
function toArgs(args: unknown[]): InArgs {
  if (args.length === 1 && args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0]) && !(args[0] instanceof Uint8Array)) {
    // Named-parameter object (kept for parity, even though the codebase uses ?).
    const obj = args[0] as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k.replace(/^[@:$]/, '')] = v ?? null;
    return out as InArgs;
  }
  return args.map((a) => (a === undefined ? null : a)) as InArgs;
}

function toStatement(stmtOrSql: string): { sql: string; execute: (args: InArgs) => Promise<{ changes: number; lastInsertRowid: number }> } {
  return {
    sql: stmtOrSql,
    execute: async (args: InArgs) => {
      const r = await cloud.execute({ sql: stmtOrSql, args });
      const last = typeof r.lastInsertRowid === 'bigint' ? Number(r.lastInsertRowid) : (r.lastInsertRowid ?? 0);
      return { changes: r.rowsAffected, lastInsertRowid: last };
    },
  };
}

export function prepare(sql: string): Statement {
  return {
    run: async (...args: unknown[]) => toStatement(sql).execute(toArgs(args)),
    get: async (...args: unknown[]) => {
      const r = await cloud.execute({ sql, args: toArgs(args) });
      return (r.rows[0] as Record<string, unknown> | undefined) ?? undefined;
    },
    all: async (...args: unknown[]) => {
      const r = await cloud.execute({ sql, args: toArgs(args) });
      return r.rows as Record<string, unknown>[];
    },
  };
}

/** Executes one or more semicolon-separated statements (used for DDL/schema). */
export async function exec(sql: string): Promise<void> {
  const trimmed = sql.trim();
  if (/;\s*$/.test(trimmed) && (trimmed.match(/;/g) || []).length > 1) {
    await cloud.executeMultiple(sql);
  } else {
    await cloud.execute(sql.replace(/;\s*$/, ''));
  }
  return undefined;
}

/** Run fn inside a database transaction (rolls back on any thrown error). */
export async function tx<T>(fn: (t: Transaction) => Promise<T>): Promise<T> {
  const t = await cloud.transaction('write');
  try {
    const value = await fn(t);
    await t.commit();
    return value;
  } catch (err) {
    try {
      await t.rollback();
    } catch {
      /* ignore rollback failure — original error is more useful */
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Schema. Identical to the previous db.ts so both engines create the same
// database; kept in one place as the single source of truth.
// ---------------------------------------------------------------------------
export async function migrate(): Promise<void> {
  await exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'SUPER_ADMIN'
        CHECK (role IN ('SUPER_ADMIN','ELECTORAL_ADMIN','VERIFICATION_ADMIN','CONTENT_ADMIN','RESULTS_OBSERVER')),
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      matric_number TEXT NOT NULL UNIQUE,
      email TEXT,
      phone_raw TEXT,
      phone_normalized TEXT,
      level TEXT,
      id_card_filename TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION'
        CHECK (status IN ('PENDING_VERIFICATION','ACTIVE','GRADUATED','SUSPENDED','INELIGIBLE','REJECTED')),
      source TEXT NOT NULL DEFAULT 'manual',
      password_hash TEXT,
      invite_token_hash TEXT,
      invite_expires_at TEXT,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
    CREATE INDEX IF NOT EXISTS idx_students_normalized ON students(matric_number);

    CREATE TABLE IF NOT EXISTS approved_whatsapp_numbers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_raw TEXT NOT NULL,
      phone_normalized TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      added_by_admin_id INTEGER REFERENCES admins(id),
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_whatsapp_active ON approved_whatsapp_numbers(active);

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS elections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      opens_at TEXT NOT NULL,
      closes_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','SCHEDULED','OPEN','CLOSED','RESULTS_PUBLISHED')),
      -- How results are released once voting closes:
      --   manual    -> stay sealed until an admin (SUPER_ADMIN / ELECTORAL) presses Publish.
      --   auto      -> appear automatically the moment voting closes.
      --   scheduled -> appear automatically at results_announce_at.
      results_mode TEXT NOT NULL DEFAULT 'manual'
        CHECK (results_mode IN ('manual','auto','scheduled')),
      results_announce_at TEXT,
      results_published_at TEXT,
      created_by_admin_id INTEGER REFERENCES admins(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS election_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      election_id INTEGER NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      UNIQUE (election_id, name)
    );
    CREATE INDEX IF NOT EXISTS idx_positions_election ON election_positions(election_id);

    CREATE TABLE IF NOT EXISTS contestants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position_id INTEGER NOT NULL REFERENCES election_positions(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      level TEXT,
      photo_filename TEXT,
      manifesto TEXT NOT NULL DEFAULT '',
      biography TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_by_admin_id INTEGER REFERENCES admins(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_contestants_position ON contestants(position_id);

    CREATE TABLE IF NOT EXISTS election_participation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      election_id INTEGER NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id),
      confirmation_code TEXT NOT NULL UNIQUE,
      voted_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (election_id, student_id)
    );
    CREATE INDEX IF NOT EXISTS idx_participation_election ON election_participation(election_id);
    CREATE INDEX IF NOT EXISTS idx_participation_student ON election_participation(student_id);

    CREATE TABLE IF NOT EXISTS ballots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      election_id INTEGER NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ballots_election ON ballots(election_id);

    CREATE TABLE IF NOT EXISTS ballot_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ballot_id INTEGER NOT NULL REFERENCES ballots(id) ON DELETE CASCADE,
      position_id INTEGER NOT NULL REFERENCES election_positions(id) ON DELETE CASCADE,
      contestant_id INTEGER NOT NULL REFERENCES contestants(id),
      UNIQUE (ballot_id, position_id)
    );
    CREATE INDEX IF NOT EXISTS idx_ballot_items_contestant ON ballot_items(contestant_id);

    CREATE TABLE IF NOT EXISTS content_blocks (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Union News',
      excerpt TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT 'OSU Executive Council',
      date_label TEXT NOT NULL DEFAULT '',
      image TEXT,
      published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date_label TEXT NOT NULL DEFAULT '',
      time TEXT NOT NULL DEFAULT '',
      venue TEXT NOT NULL DEFAULT '',
      excerpt TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'upcoming',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS gallery_albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gallery_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      album_id INTEGER NOT NULL REFERENCES gallery_albums(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_gallery_images_album ON gallery_images(album_id);

    -- Photo bytes live IN the cloud database so uploaded pictures survive
    -- Render restarts (free Render disk is temporary). gallery_images holds
    -- the metadata + display URL; this table holds the actual file bytes.
    CREATE TABLE IF NOT EXISTS gallery_image_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_id INTEGER NOT NULL UNIQUE REFERENCES gallery_images(id) ON DELETE CASCADE,
      content_type TEXT NOT NULL DEFAULT 'image/jpeg',
      data BLOB NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_gallery_image_files_image ON gallery_image_files(image_id);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_type TEXT NOT NULL DEFAULT 'admin'
        CHECK (actor_type IN ('admin','student','system')),
      actor_id INTEGER,
      actor_label TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      description TEXT,
      ip TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  `);

  // Additive migrations for tables created before a column existed.
  const studentCols = (await prepare(`PRAGMA table_info(students)`).all()).map((c) => String(c.name));
  if (!studentCols.includes('must_change_password')) {
    await exec(`ALTER TABLE students ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0`);
    console.log('migrated: students.must_change_password');
  }

  const electionCols = (await prepare(`PRAGMA table_info(elections)`).all()).map((c) => String(c.name));
  if (!electionCols.includes('results_mode')) {
    await exec(`ALTER TABLE elections ADD COLUMN results_mode TEXT NOT NULL DEFAULT 'manual'`);
    console.log('migrated: elections.results_mode');
  }
  if (!electionCols.includes('results_announce_at')) {
    await exec(`ALTER TABLE elections ADD COLUMN results_announce_at TEXT`);
    console.log('migrated: elections.results_announce_at');
  }
}
