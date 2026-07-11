# Decoory Interior's

Admin dashboard + client mobile app for Decoory Interior's, an Indian interior design company — keeps homeowners updated on their project from design to handover, and gives the Decoory team one place to run every active site.

Two faces, one codebase: an admin web dashboard and a client mobile app (Android APK via Capacitor), role-routed from a single React app. Design tokens match the two prototypes exactly: ink green `#1E2622`, warm paper `#F4F2EC`, brass `#A8823C`, brass-soft `#F0E7D2`, Fraunces for display headings, Archivo for UI text.

## Quick start

```bash
npm install
npm run install:all   # installs server/ and client/ dependencies
npm run seed           # wipes and reloads the exact prototype mock data
npm run dev            # runs the API (:4000) and the web app (:5173) together
```

Open `http://localhost:5173`. Seeded logins (also printed by `npm run seed`):

| Role | Login | Password / PIN |
|---|---|---|
| Admin | `admin@decoory.com` | `decoory123` |
| Client (Sharma Residence, DCR-101) | `rakesh.sharma@example.com` | `decoory123` |
| Client (Verma Villa, DCR-102) | `anita.verma@example.com` | `decoory123` |
| Client (Kapoor Apartment, DCR-103) | `neha.kapoor@example.com` | `decoory123` |
| Project code + PIN (no account) | `DCR-101` / `DCR-102` / `DCR-103` | `1101` / `1102` / `1103` |

Copy `server/.env.example` to `server/.env` and fill in keys as they become relevant — every third-party integration below has a documented, fully-functional fallback when its env vars are absent, so the app runs completely without any of them configured.

## Environment variables

All in `server/.env.example`. None are required for local dev — see the fallback column.

| Variable | Used for | If absent |
|---|---|---|
| `PORT`, `JWT_SECRET` | Server port, auth token signing | `JWT_SECRET` defaults to a dev value — **set a real one in production** |
| `SQLITE_PATH` | Local dev DB location | Defaults to `server/decoory.db` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Production Postgres + Storage | Local SQLite + local disk uploads |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | AI budget estimates + 10-day upsell suggestions | Rule-based rate-card estimator and rotating suggestion templates |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Backend Razorpay endpoints (implemented, not currently called by the client UI — see "Payment collection" below) | No effect on the app today; admin's "Mark as paid" is the only payment-completion path in current use |
| `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` | Push notifications | In-app notifications still work; push is just skipped |

## Testing

```bash
npm test   # from repo root, or `cd server && npm test`
```

24 tests, all pure/unit-level (no DB or network needed). The two suites worth calling out:

- **`server/src/utils/reminderWindow.test.js`** — the trickiest business rule per spec: payment reminders fire only when due in 6-10 hours *and* the current time is between 8AM-8PM IST (never outside that window), overdue reminders fire once daily at 10AM, and nothing ever double-fires. 17 tests cover the window boundaries (7:59 vs 8:00, 19:59:59 vs 20:00), the 6/10-hour boundaries, "in range but wrong time of day," and the once-per-day dedup logic, all in IST regardless of the machine's local timezone.
- **`server/src/services/razorpay.test.js`** — the HMAC signature verification for both the client-side payment-verify flow and the server-side webhook: valid signature, tampered signature, signature replayed against a different payment id, missing fields.

For everything else (every screen, every CRUD flow, every automation), see the phase-by-phase verification notes in the git log — each phase's commit records exactly what was exercised end-to-end in a real browser against the live backend before moving on, plus every real bug found and fixed along the way.

## Deployment

### 1. Database — Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `server/src/db/schema.sql` — it's already written to be Postgres-compatible ANSI SQL (the one SQLite-specific piece, `strftime(...)` timestamp defaults, would need swapping for Postgres's `now()`; see "Migration path" below).
3. Storage → create a bucket (default name `decoory-media`, matching `SUPABASE_STORAGE_BUCKET`) and make it public (or configure signed URLs if you'd rather not).
4. Settings → API: copy the Project URL and the `service_role` key (not the `anon` key — the server needs elevated Storage access) into `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`.

**Migration path from SQLite:** the schema was designed for a clean move — same table/column names throughout, money always in paise (`INTEGER`), and every app-level query goes through `better-sqlite3`-style parameterized SQL in `server/src/db/index.js` and the route files, not raw string interpolation. Swapping the driver (e.g. to `pg` or `postgres.js`) means rewriting `db/index.js`'s connection + the handful of SQLite-specific bits: `strftime('%Y-%m-%dT%H:%M:%fZ','now')` → Postgres `now()`, and `INSERT ... ON CONFLICT` (already Postgres-compatible syntax, used for team assignment and push-token upserts). Nothing in the route/service layer is SQLite-specific.

### 2. Server — Railway or Render

Either platform: point it at the `server/` directory, Node 22.5+ (uses the built-in `node:sqlite` — or your Postgres driver once migrated), build command `npm install`, start command `npm start`.

- **Railway:** New Project → Deploy from GitHub → set the root directory to `server` → add the env vars from the table above → Railway auto-detects the Node app and assigns a public URL.
- **Render:** New → Web Service → connect the repo, root directory `server`, build `npm install`, start `npm start` → add env vars in the dashboard.

Either way:
- Set `NODE_ENV=production` (this also disables the `/api/dev/*` time-travel endpoints — see `server/src/app.js`).
- If staying on SQLite in production, mount a persistent volume/disk and point `SQLITE_PATH` at it — container filesystems are usually ephemeral, so without a persistent volume the database resets on every deploy.
- Run `npm run seed` once against the deployed database (or write your own production data) — it's destructive (wipes rows) so don't re-run it after the app has real client data.
- Razorpay's webhook needs a public HTTPS URL: set it to `https://<your-server>/api/webhooks/razorpay` in the Razorpay dashboard, event `payment.captured`.

### 3. Client — same server, or split

`client/` is a static Vite build (`npm run build` → `client/dist/`) that talks to the API via same-origin `/api/*` and `/uploads/*` requests (see `client/vite.config.js`'s dev proxy). Two ways to make that resolve in production: serve `client/dist/` as static files from the same Express app (`express.static` — simplest, no CORS/proxy config needed) or, if hosting the web build separately, set `VITE_API_URL` (`client/.env.example`) to the deployed backend's absolute URL before running `npm run build`. **The Android app always needs `VITE_API_URL` set** regardless of how the web build is hosted — its WebView has no same-origin backend to fall back to (see "Handing the APK to clients" below).

### 4. Handing the APK to clients

No Play Store listing needed for this use case — Decoory hands the APK directly:

1. Build a **release** APK (not the debug one from local dev): in `client/android`, `./gradlew assembleRelease`, signed with a real keystore (`keytool -genkey -v -keystore decoory-release.keystore -alias decoory -keyalg RSA -keysize 2048 -validity 10000`, then configure `android/app/build.gradle`'s `signingConfigs` to use it — Capacitor's default project has a `release` build type ready for this).
2. **Before building, set `VITE_API_URL`** (`client/.env.example`) to a real, network-reachable server URL — a deployed backend, or your machine's LAN IP for local testing on a phone over the same WiFi (e.g. `http://192.168.1.5:4000`, found via `ipconfig`). This is required, not optional: the app's `/api/*` and `/uploads/*` calls are relative paths that only resolve inside a browser (Vite's dev proxy) or a same-origin production deploy — the Capacitor WebView has neither, so without this the installed app loads fine but every login/data fetch fails silently. Then rebuild before syncing:
   ```bash
   cd client
   echo VITE_API_URL=http://192.168.1.5:4000 > .env.local   # your own IP/URL
   npm run build && npx cap sync android
   ```
   Windows Firewall may prompt to allow inbound connections on your API port the first time a phone on the LAN reaches it — allow it, or the phone's requests will time out even though `curl` from the same machine works.
3. Host the resulting `app-release.apk` somewhere clients can download it from a phone browser (a private link — Supabase Storage, a Drive link, an S3 bucket) and send that link. Android will prompt to allow installs from that source ("unknown sources") the first time — expected for a non-Play-Store APK.
4. Each client logs in with the project-code + PIN issued at booking, or their email/phone + password — no separate account setup needed.

## Media & seed photos

The two prototypes render site photos as CSS gradients (no real image assets ship with a JSX mockup). Seeded `update_media` rows preserve that: `file_path` uses a `placeholder://<hex1>-<hex2>?caption=...` scheme the frontend renders as a gradient tile, matching the prototype exactly. Real uploads land in `server/uploads/` (dev) or Supabase Storage (prod) and are served as normal file/image URLs — the two schemes coexist in the same table, and `shared/ui.jsx`'s `Photo` component and `PhotoViewer` render whichever one a given row has.

## File uploads

`POST /api/uploads` (Multer, in-memory, 25MB cap, image/video only) is the one upload endpoint used by both the admin daily-update composer and the client chat's attachment button. `server/src/services/storage.js` picks local disk (`server/uploads/`, served via `express.static` at `/uploads/*`) or Supabase Storage based on whether `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are set — callers get back `{ filePath, kind }` either way and never branch on which backend is active. A client chat attachment also auto-creates a `design-upload` lead and notifies every admin, per spec.

## Timestamp format

All `created_at`/`updated_at`/`paid_at` columns are stored as `strftime('%Y-%m-%dT%H:%M:%fZ','now')` (ISO-8601, UTC, `Z` suffix) everywhere — schema defaults, route-level writes, and the seed script's `ist()` helper all normalize to this one format. This matters because SQLite timestamps are plain `TEXT`, sorted lexicographically: mixing this with SQLite's other built-in default (`datetime('now')`, which is space-separated, e.g. `2026-07-11 09:31:29`) silently breaks `ORDER BY created_at` — the space character sorts before `T`, so space-separated rows always sort first regardless of actual time. Keep every new timestamp write on the `strftime(...,'Z')` form.

**Schema changes need a fresh DB file, not just an edited `schema.sql`.** `db/index.js` runs `CREATE TABLE IF NOT EXISTS` on startup, which is a no-op for tables that already exist — editing a column's `DEFAULT` (or any other definition) in `schema.sql` has zero effect on an already-created `decoory.db` until you delete the file (`rm server/decoory.db*`) and let it recreate from scratch, then `npm run seed` again.

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

## AI budget estimation

`POST /api/estimate` is public (no auth) — it's the backend for the "Free budget estimate" screen at `/estimate`, reachable without logging in from the Login screen. It calls `services/anthropic.js`'s `estimateBudget()`, which uses Claude when `ANTHROPIC_API_KEY` is set, or falls back to a deterministic rate-card calculation (`config/rateCard.js`: ₹/sqft by room type × a city cost multiplier) when it's absent or the AI call/JSON-parse fails. Either path returns the same shape — an estimate range, 2-5 suggested brands (from the same six-brand catalog projects use, `config/brands.js`), and a timeline — and every submission is saved as a `leads` row (`source: 'self-estimation'`) with the full form as `search_data`, notifying all admins.

## Payment collection: WhatsApp link, not online checkout

The client Payments screen's "Pay" action is a `wa.me` deep link (`client/src/shared/contact.js`) that opens a WhatsApp chat to Decoory's payment number with the project, milestone, and amount pre-filled — the client messages for a payment link and pays outside the app; admin then marks it paid manually (`POST /api/payments/:id/mark-paid`, already the Razorpay-absent fallback from day one) once received. This was a deliberate product change partway through the build, replacing the original in-app Razorpay checkout. It's a plain link (no API, no credentials, no automated messages) — not the "WhatsApp integration" the original spec excluded, which was about automated reminders.

The backend Razorpay integration (`services/razorpay.js`, `routes/payments.js`'s `checkout`/`verify` endpoints, `routes/webhooks.js`) is still fully implemented, tested (`services/razorpay.test.js`), and documented below — it's just not called from the client UI anymore. Re-wiring it (or building an admin-side "send Razorpay link" flow instead of WhatsApp) is straightforward if that ever changes.

### Razorpay (test mode) — implemented, currently unused by the client UI

Three endpoints, all guarded by ownership checks (a client can only act on their own project's payments):

- `POST /api/payments/:id/checkout` — creates a Razorpay order for Checkout.js to open. Returns `{ razorpayOrder: null }` when `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are absent rather than erroring.
- `POST /api/payments/:id/verify` — verifies the HMAC-SHA256 signature Razorpay's Checkout.js success handler returns (`services/razorpay.js`) before calling the same `markPaid()` the admin's manual fallback uses.
- `POST /api/webhooks/razorpay` — the server-side `payment.captured` path. Needs raw request bytes for its own HMAC check, so it's mounted in `app.js` *before* the global `express.json()` parser, using `express.raw()` instead.

## Firebase Cloud Messaging (push)

`services/notify.js`'s `notify()` — the one function every automation and route uses to create an in-app notification — also fires a push in the same call (fire-and-forget, never blocks or throws on push failure). `services/push.js` sends to every device token the user has registered via `POST /api/push-tokens`, and prunes tokens FCM reports as unregistered (uninstalled app, expired token). Client-side registration (`client/src/shared/push.js`) is gated on `Capacitor.isNativePlatform()`, so it's a total no-op in the browser and only actually registers on the Android app.

## Android app (Capacitor)

`client/android/` is a real, already-generated native project — app id `com.decoory.client`, app name "Decoory", launcher icon and splash screen built from the real Decoory logo (`client/assets-src/logo.png`, extracted from `logo-original-source.jpeg`) on a paper (`#F4F2EC`) background, chosen because the logo's own dark wordmark has poor contrast on the ink-green surfaces used elsewhere — adaptive icon + legacy + round + dark-mode splash, all densities, generated via `npx capacitor-assets generate`. The wide banner-shaped logo needed the adaptive icon's foreground/background layers supplied separately (`icon-foreground.png`/`icon-background.png`) rather than a single flat `icon.png` — the tool's auto-crop-to-content-bounds heuristic badly over-zooms a short, wide source when deriving one from a flat image; the legacy (pre-Android-8) icon is composited from the same two layers directly rather than through that heuristic. Same logo now appears on the Login screen and (on a light paper badge for contrast) the admin sidebar.

```bash
cd client
npm run build              # rebuild the web app into dist/
npx cap sync android       # copy dist/ + plugin native code into the Android project
cd android
./gradlew assembleDebug    # Windows: gradlew.bat assembleDebug
```

The debug APK normally lands at `client/android/app/build/outputs/apk/debug/app-debug.apk` — on at least one confirmed build it landed at `.../app/build/intermediates/apk/debug/app-debug.apk` instead (AGP version-dependent); if the first path is empty after a successful build, check the second. Needs [Android Studio](https://developer.android.com/studio) installed (bundles the JDK + Android SDK) — see "Handing the APK to clients" above for the release-build/signing steps, and **"Client — same server, or split" above for `VITE_API_URL`, required for the app to reach the API at all**. Push notifications on-device additionally need `google-services.json` from a real Firebase project, placed at `client/android/app/google-services.json` (gitignored).

## Project structure

```
server/           Express API, SQLite DB (node:sqlite), seed script, scheduler
  src/routes/      One file per resource — the REST surface
  src/services/    Business logic: notify, push, storage, anthropic, razorpay, jobs, scheduler
  src/config/      Rate card + brand catalog (rule-based estimator inputs)
  src/utils/       Pure helpers — money formatting, the tested reminder-window logic, dev clock
client/           React + Vite app — single codebase, role-based routing
  src/admin/       Admin dashboard screens
  src/client-app/  Client mobile app screens
  src/public/      Public self-estimation screen (no login)
  src/shared/      Design tokens, UI primitives, WhatsApp/push helpers shared by both faces
  android/         Capacitor Android native project
```
