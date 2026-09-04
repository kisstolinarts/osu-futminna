import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database lives in <project>/data/osu.db (gitignored).
const dataDir = path.resolve(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'osu.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Schema. Kept in one place so it reads like a single "migration". Later
// phases append further tables (elections, ballots, etc.) here.
// ---------------------------------------------------------------------------
export function migrate() {
  db.exec(`    CREATE TABLE IF NOT EXISTS admins (
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

    -- ------------------------------------------------------------------
    -- ELECTION SYSTEM (Phase 3)
    -- Anonymous-ballot design: the election_participation table records WHO
    -- voted (student id) while the ballot_items table records WHAT was voted
    -- (contestant id) under a random ballot_id NOT linked to the student.
    -- The two halves never share a key, so no admin can reconstruct a
    -- student's choices.
    -- ------------------------------------------------------------------
    CREATE TABLE IF NOT EXISTS elections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      opens_at TEXT NOT NULL,
      closes_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','SCHEDULED','OPEN','CLOSED','RESULTS_PUBLISHED')),
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

    -- election_participation: WHO voted (student + election + receipt code).
    -- Intentionally NO link to a ballot.
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

    -- ballots / ballot_items: WHAT was voted, keyed by an internal ballot id.
    -- Intentionally NO student reference, so no join can map a student to a
    -- ballot. Atomicity between the two halves is guaranteed at the app layer
    -- by inserting them inside one database transaction.
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

    -- ------------------------------------------------------------------
    -- CONTENT MANAGEMENT (editable by admins without touching code)
    -- ------------------------------------------------------------------
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

  // --- Lightweight additive migrations for already-created tables ---------
  // (CREATE TABLE IF NOT EXISTS won't add columns to existing tables.)
  const studentCols = (db.prepare(`PRAGMA table_info(students)`).all() as { name: string }[]).map((c) => c.name);
  if (!studentCols.includes('must_change_password')) {
    db.exec(`ALTER TABLE students ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0`);
    console.log('migrated: students.must_change_password');
  }
}
