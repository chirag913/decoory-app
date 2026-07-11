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

The two prototypes render site photos as CSS gradients (no real image assets ship with a JSX mockup). Seeded `update_media` rows preserve that: `file_path` uses a `placeholder://<hex1>-<hex2>?caption=...` scheme that the frontend renders as a gradient tile, matching the prototype exactly. Real uploads (Phase 4) land in `server/uploads/` and are served as normal file URLs — the two schemes coexist in the same table.

## Project structure

```
server/       Express API, SQLite DB, seed script
client/       React + Vite app (admin dashboard + client app, role-based routing) — Phase 2/3
android/      Capacitor Android wrapper — Phase 9
```

Full setup, deployment, and APK build docs land in Phase 10.
