-- Decoory Interior's — schema (SQLite for local dev; kept ANSI-ish for a clean Postgres/Supabase migration)
-- Money stored in paise (INTEGER). Timestamps stored as ISO-8601 TEXT.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  role          TEXT NOT NULL CHECK (role IN ('admin','client')),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE,
  phone         TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id              TEXT PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,          -- e.g. DCR-101
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,                 -- e.g. "3BHK · Sector 62, Noida"
  client_user_id  TEXT NOT NULL REFERENCES users(id),
  budget_paise    INTEGER NOT NULL,
  progress_pct    INTEGER NOT NULL DEFAULT 0,
  current_stage   TEXT NOT NULL DEFAULT '',
  start_date      TEXT,
  handover_date   TEXT,
  health          TEXT NOT NULL DEFAULT 'on-track' CHECK (health IN ('on-track','attention')),
  today_plan      TEXT DEFAULT '',
  today_team      TEXT DEFAULT '',
  pin             TEXT,                          -- PIN issued at booking, paired with `code` for client login
  completed_at    TEXT,                          -- set/cleared automatically when progress_pct crosses 100 (services/progress.js)
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS milestones (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id),
  title        TEXT NOT NULL,
  done         INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS daily_updates (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id),
  update_date  TEXT NOT NULL,                    -- date the work happened
  items        TEXT NOT NULL,                    -- JSON array of strings
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS update_media (
  id          TEXT PRIMARY KEY,
  update_id   TEXT NOT NULL REFERENCES daily_updates(id),
  file_path   TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('photo','video')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL REFERENCES projects(id),
  label             TEXT NOT NULL,
  amount_paise      INTEGER NOT NULL,
  due_at            TEXT NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('paid','upcoming','overdue','scheduled')),
  paid_at           TEXT,
  reminder_sent_at  TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS team_members (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,
  phone       TEXT,
  photo_path  TEXT,
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS project_team (
  project_id      TEXT NOT NULL REFERENCES projects(id),
  team_member_id  TEXT NOT NULL REFERENCES team_members(id),
  PRIMARY KEY (project_id, team_member_id)
);

CREATE TABLE IF NOT EXISTS materials (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id),
  brand       TEXT NOT NULL,
  used_for    TEXT NOT NULL,
  tagline     TEXT,
  info_url    TEXT
);

CREATE TABLE IF NOT EXISTS leads (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  city                  TEXT,
  phone                 TEXT,
  scope                 TEXT,
  stated_budget_paise   INTEGER,
  ai_estimate_low_paise  INTEGER,
  ai_estimate_high_paise INTEGER,
  source                TEXT NOT NULL CHECK (source IN ('self-estimation','design-upload','manual')),
  status                TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified')),
  search_data           TEXT,                     -- JSON blob of everything the user entered
  follow_up_at          TEXT,                     -- next follow-up call/touchpoint due (admin-set)
  site_visit_at         TEXT,                     -- scheduled site visit (admin-set)
  quote_status          TEXT NOT NULL DEFAULT 'none' CHECK (quote_status IN ('none','sent','accepted','declined')),
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL REFERENCES projects(id),
  sender_user_id   TEXT NOT NULL REFERENCES users(id),
  sender_label     TEXT,                          -- display name override, e.g. "Mahesh (Supervisor)"
  text             TEXT,
  attachment_path  TEXT,
  read_at          TEXT,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT NOT NULL,                       -- morning_brief | update | payment_due | payment_thanks | suggestion | brand | chat | lead
  data        TEXT,                                -- JSON: e.g. { projectId }
  read        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS suggestions (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id),
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  price_note   TEXT,
  status       TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','interested','dismissed')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,   -- warranty | payment_terms | material_policy | timeline_rules | change_requests | service_terms | usp
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,          -- plain text, or JSON array for usp checklist
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_updates_project ON daily_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_project ON payments(project_id);
CREATE INDEX IF NOT EXISTS idx_materials_project ON materials(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_project ON suggestions(project_id);
