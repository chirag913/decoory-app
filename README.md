# Decoory Interior's

Admin dashboard + client mobile app for Decoory Interior's, an Indian interior design company.

**Status:** Phase 1 complete — backend (Express + SQLite via `node:sqlite`, JWT auth, full REST API) is built, seeded, and tested. Client/admin frontends, uploads, scheduler, AI estimation, Razorpay, push, and the Android build come in subsequent phases (see project task list).

## Backend quick start

```bash
cd server
npm install
npm run seed   # wipes and reloads the exact prototype mock data
npm run dev
```

Server runs at `http://localhost:4000`. Health check: `GET /api/health`.

Seeded logins (dev only, printed again by `npm run seed`):
- Admin: `admin@decoory.com` / `decoory123`
- Clients: `rakesh.sharma@example.com`, `anita.verma@example.com`, `neha.kapoor@example.com` — all `/ decoory123`
- Project-code + PIN login (used by the client app's non-account login): `DCR-101` / `1101`, `DCR-102` / `1102`, `DCR-103` / `1103`

Copy `server/.env.example` to `server/.env` and fill in keys as they become relevant (Anthropic, Razorpay, Firebase, Supabase) — every integration has a documented fallback when its env vars are absent.

## Media & seed photos

The two prototypes render site photos as CSS gradients (no real image assets ship with a JSX mockup). Seeded `update_media` rows preserve that: `file_path` uses a `placeholder://<hex1>-<hex2>?caption=...` scheme that the frontend renders as a gradient tile, matching the prototype exactly. Real uploads land in `server/uploads/` (dev) or Supabase Storage (prod) and are served as normal file/image URLs — the two schemes coexist in the same table, and `shared/ui.jsx`'s `Photo` component and `PhotoViewer` render whichever one a given row has.

## File uploads

`POST /api/uploads` (Multer, in-memory, 25MB cap, image/video only) is the one upload endpoint used by both the admin daily-update composer and the client chat's attachment button. `server/src/services/storage.js` picks local disk (`server/uploads/`, served via `express.static` at `/uploads/*`) or Supabase Storage based on whether `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are set — callers get back `{ filePath, kind }` either way and never branch on which backend is active. A client chat attachment also auto-creates a `design-upload` lead and notifies every admin, per spec.

## Timestamp format

All `created_at`/`updated_at`/`paid_at` columns are stored as `strftime('%Y-%m-%dT%H:%M:%fZ','now')` (ISO-8601, UTC, `Z` suffix) everywhere — schema defaults, route-level writes, and the seed script's `ist()` helper all normalize to this one format. This matters because SQLite timestamps are plain `TEXT`, sorted lexicographically: mixing this with SQLite's other built-in default (`datetime('now')`, which is space-separated, e.g. `2026-07-11 09:31:29`) silently breaks `ORDER BY created_at` — the space character sorts before `T`, so space-separated rows always sort first regardless of actual time. Keep every new timestamp write on the `strftime(...,'Z')` form.

**Schema changes need a fresh DB file, not just an edited `schema.sql`.** `db/index.js` runs `CREATE TABLE IF NOT EXISTS` on startup, which is a no-op for tables that already exist — editing a column's `DEFAULT` (or any other definition) in `schema.sql` has zero effect on an already-created `decoory.db` until you delete the file (`rm server/decoory.db*`) and let it recreate from scratch, then `npm run seed` again. `npm run seed` alone only wipes rows, not table definitions. This bit us once: the timestamp-format fix above was applied to `schema.sql` but silently didn't take effect on the live dev DB until the file was deleted.

## Project structure

```
server/       Express API, SQLite DB, seed script
client/       React + Vite app (admin dashboard + client app, role-based routing) — Phase 2/3
android/      Capacitor Android wrapper — Phase 9
```

Full setup, deployment, and APK build docs land in Phase 10.
