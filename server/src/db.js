import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/goals.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    deadline TEXT NOT NULL,
    category TEXT,
    phases TEXT,
    clarifying_answers TEXT,
    preferred_times TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    day_number INTEGER NOT NULL,
    phase_name TEXT,
    tasks TEXT NOT NULL,
    generated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (goal_id) REFERENCES goals(id),
    UNIQUE(goal_id, date)
  );

  CREATE TABLE IF NOT EXISTS task_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_id INTEGER NOT NULL,
    task_index INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    completed_at TEXT,
    note TEXT,
    FOREIGN KEY (day_id) REFERENCES days(id),
    UNIQUE(day_id, task_index)
  );

  CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    value TEXT NOT NULL,
    FOREIGN KEY (goal_id) REFERENCES goals(id)
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT UNIQUE NOT NULL,
    keys TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Per-user mascot/wardrobe state (Supabase user id as key; node:sqlite stays
  -- the source of truth, Supabase is only used for auth/identity)
  CREATE TABLE IF NOT EXISTS user_mascot_state (
    user_id TEXT PRIMARY KEY,
    selected_mascot_id TEXT DEFAULT 'prudence',
    unlocked_mascots TEXT DEFAULT '["prudence"]',
    max_streak INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- Single-row-per-key store for one-time server-side flags (e.g. legacy data claim)
  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Safe migrations for columns added after initial deploy
try { db.exec(`ALTER TABLE goals ADD COLUMN color TEXT DEFAULT '#EC8B43'`); } catch {}
try { db.exec(`ALTER TABLE goals ADD COLUMN mascot_id TEXT DEFAULT 'prudence'`); } catch {}
try { db.exec(`ALTER TABLE goals ADD COLUMN user_id TEXT`); } catch {}
try { db.exec(`ALTER TABLE task_completions ADD COLUMN notification_id TEXT`); } catch {}

// Wrap node:sqlite's StatementSync to match the better-sqlite3 API shape
// (prepare returns an object with .all(), .get(), .run())
function prepare(sql) {
  const stmt = db.prepare(sql);
  return {
    all: (...args) => stmt.all(...args),
    get: (...args) => stmt.get(...args),
    run: (...args) => stmt.run(...args),
  };
}

export default { prepare, exec: (sql) => db.exec(sql) };
