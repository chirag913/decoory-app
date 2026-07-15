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
// On mismatch, every app table is dropped and rebuilt fresh from the
// current schema.sql — safe because a stale schema always needs a reseed
// right after anyway (same `npm run seed` step as before; this just makes
// the rebuild itself automatic instead of needing the temporary
// "add npm run seed to the Start Command" dance on every schema change).
const SCHEMA_VERSION = 7;

function currentSchemaVersion() {
  const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_meta'").get();
  if (!exists) return 0;
  const row = db.prepare("SELECT version FROM schema_meta LIMIT 1").get();
  return row ? row.version : 0;
}

export function migrate() {
  db.exec("CREATE TABLE IF NOT EXISTS schema_meta (version INTEGER NOT NULL)");

  if (currentSchemaVersion() < SCHEMA_VERSION) {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'schema_meta'"
    ).all();
    db.exec("PRAGMA foreign_keys = OFF");
    for (const { name } of tables) db.exec(`DROP TABLE IF EXISTS "${name}"`);
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("DELETE FROM schema_meta");
    db.prepare("INSERT INTO schema_meta (version) VALUES (?)").run(SCHEMA_VERSION);
  }

  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  db.exec(schema);
}

migrate();

export default db;
