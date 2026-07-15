import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, "../../decoory.db");

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// Thin shim so call sites can use the familiar better-sqlite3-style
// `db.transaction(fn)()` API on top of node:sqlite's DatabaseSync.
db.transaction = (fn) => (...args) => {
  db.exec("BEGIN");
  try {
    const result = fn(...args);
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
};

// Bump this whenever schema.sql changes in a way an already-existing table
// can't pick up on its own — `CREATE TABLE IF NOT EXISTS` is a no-op for a
// table that already exists, so adding a column or widening a CHECK
// constraint never applies to a database that was created under an older
// schema.sql (e.g. one sitting on a Railway persistent volume). Without
// this, that database silently stays stale forever and every later schema
// change fails at runtime ("no such column: ...") instead of applying.
//
// On mismatch, every table is rebuilt against the current schema.sql
// WITHOUT losing data: each table is renamed aside, recreated under its
// real name from schema.sql, then its old rows are copied back in (only
// the columns that still exist — new columns fall back to their DEFAULT,
// which is why every new column added here needs one). This makes a
// version bump safe to ship on its own; it no longer requires a `npm run
// seed` afterwards. seed.js remains a separate, deliberate action for
// resetting to demo data — it is never run automatically.
const SCHEMA_VERSION = 8;

function currentSchemaVersion() {
  const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_meta'").get();
  if (!exists) return 0;
  const row = db.prepare("SELECT version FROM schema_meta LIMIT 1").get();
  return row ? row.version : 0;
}

function rebuildPreservingData() {
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'schema_meta'"
  ).all().map((r) => r.name);

  db.exec("PRAGMA foreign_keys = OFF");
  const tx = db.transaction(() => {
    for (const name of tables) db.exec(`ALTER TABLE "${name}" RENAME TO "_old_${name}"`);

    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    db.exec(schema);

    for (const name of tables) {
      const oldCols = db.prepare(`PRAGMA table_info("_old_${name}")`).all().map((c) => c.name);
      const newCols = db.prepare(`PRAGMA table_info("${name}")`).all().map((c) => c.name);
      const common = oldCols.filter((c) => newCols.includes(c));
      if (common.length) {
        const colList = common.map((c) => `"${c}"`).join(", ");
        db.exec(`INSERT INTO "${name}" (${colList}) SELECT ${colList} FROM "_old_${name}"`);
      }
      db.exec(`DROP TABLE "_old_${name}"`);
    }
  });
  tx();
  db.exec("PRAGMA foreign_keys = ON");

  db.exec("DELETE FROM schema_meta");
  db.prepare("INSERT INTO schema_meta (version) VALUES (?)").run(SCHEMA_VERSION);
}

export function migrate() {
  db.exec("CREATE TABLE IF NOT EXISTS schema_meta (version INTEGER NOT NULL)");

  if (currentSchemaVersion() < SCHEMA_VERSION) {
    rebuildPreservingData();
  }

  // Safety net for the common case (no version bump needed): new tables
  // added straight to schema.sql still get created on a database that
  // predates them, without touching anything that already exists.
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  db.exec(schema);
}

migrate();

export default db;
