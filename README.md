# Decoory Interior's

Admin dashboard + client mobile app for Decoory Interior's, an Indian interior design company.

**Status:** Phases 1-5 complete (backend API, client app, admin dashboard, file uploads, scheduler). AI estimation, Razorpay, push, and the Android build come in subsequent phases (see project task list).

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

## Scheduler & automations

`node-cron` jobs (all `Asia/Kolkata`, wired in `services/scheduler.js`, business logic in `services/jobs.js`):

| Job | Schedule | What it does |
|---|---|---|
| Morning brief | `0 8 * * *` | In-app + push to every project with `today_plan` set |
| Payment reminders | `0 * * * *` (hourly) | Delegates to the tested `utils/reminderWindow.js` rules: upcoming (due in 6-10hrs, 8AM-8PM only) and overdue (once daily at 10AM) |
| Nightly recompute | `0 2 * * *` | Flips `upcoming` → `overdue` past due date; recomputes each project's `on-track`/`attention` health flag |
| Suggestions | `0 9 * * *` (daily tick, acts per-project every 10 days) | One AI (or rule-based fallback, see `services/anthropic.js`) upsell suggestion + one brand-trust notification |

**Testing time-based rules without waiting for real clock time:** every job reads "now" through `utils/clock.js`, which normally mirrors the system clock but can be advanced via dev-only endpoints (mounted only when `NODE_ENV !== 'production'`):

```bash
curl -X POST localhost:4000/api/dev/time/advance -H 'Content-Type: application/json' -d '{"hours": 66}'
curl -X POST localhost:4000/api/dev/run/payment-reminders   # or morning-brief / nightly / suggestions
curl -X POST localhost:4000/api/dev/time/reset
```

The cron schedule itself still fires on the real wall clock; these endpoints let you fast-forward `now()` and invoke a job function directly, bypassing the wait.

## Project structure

```
server/       Express API, SQLite DB, seed script
client/       React + Vite app (admin dashboard + client app, role-based routing) — Phase 2/3
android/      Capacitor Android wrapper — Phase 9
```

Full setup, deployment, and APK build docs land in Phase 10.
