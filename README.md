# Decoory Interior's

Admin dashboard + client mobile app for Decoory Interior's, an Indian interior design company.

**Status:** Phases 1-9 complete (backend API, client app, admin dashboard, file uploads, scheduler, AI estimation, Razorpay, Firebase push, Android wrapper). Deployment docs land next (see project task list).

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

## AI budget estimation

`POST /api/estimate` is public (no auth) — it's the backend for the "Free budget estimate" screen at `/estimate`, reachable without logging in from the Login screen. It calls `services/anthropic.js`'s `estimateBudget()`, which uses Claude when `ANTHROPIC_API_KEY` is set, or falls back to a deterministic rate-card calculation (`config/rateCard.js`: ₹/sqft by room type × a city cost multiplier) when it's absent or the AI call/JSON-parse fails. Either path returns the same shape — an estimate range, 2-5 suggested brands (from the same six-brand catalog projects use, `config/brands.js`), and a timeline — and every submission is saved as a `leads` row (`source: 'self-estimation'`) with the full form as `search_data`, notifying all admins.

## Razorpay (test mode)

Three endpoints, all guarded by ownership checks (a client can only act on their own project's payments):

- `POST /api/payments/:id/checkout` — creates a Razorpay order and returns it for Checkout.js to open. When `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are absent, returns `{ razorpayOrder: null }` instead of erroring, so the client shows "online payment isn't set up yet — contact your supervisor" rather than a dead Pay button. `client/src/shared/razorpay.js` lazy-loads `checkout.razorpay.com/v1/checkout.js` only when a payment is actually attempted.
- `POST /api/payments/:id/verify` — Checkout.js's client-side success handler isn't proof of payment on its own, so this verifies the HMAC-SHA256 signature Razorpay returns (`services/razorpay.js`) before calling the same `markPaid()` the admin's manual fallback uses — same thank-you notification either way.
- `POST /api/webhooks/razorpay` — the server-side `payment.captured` path, for redundancy beyond the client-side verify call. Needs raw request bytes for its own HMAC check, so it's mounted in `app.js` *before* the global `express.json()` parser, using `express.raw()` instead.

Since this environment has no real Razorpay test keys, the "absent" fallback path (and the admin's always-available "Mark as paid" manual action) is what's actually exercised end-to-end here; the checkout/verify/webhook code is written to Razorpay's documented signature scheme and covered by unit tests in `services/razorpay.test.js` (valid signature, tampered signature, replay with a different payment id, missing fields) — set real `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET` to exercise the live checkout flow.

## Firebase Cloud Messaging (push)

`services/notify.js`'s `notify()` — the one function every automation and route uses to create an in-app notification — also fires a push in the same call (fire-and-forget, never blocks or throws on push failure). `services/push.js` sends to every device token the user has registered via `POST /api/push-tokens`, and prunes tokens FCM reports as unregistered (uninstalled app, expired token).

This is server-side infrastructure only for now — registering an actual device needs `@capacitor/push-notifications`, which is installed alongside the Android project itself in Phase 9. Set `FCM_PROJECT_ID`/`FCM_CLIENT_EMAIL`/`FCM_PRIVATE_KEY` (a Firebase service account) to enable; without them `notify()` still creates in-app notifications exactly as before, `sendPushToUser` just returns `{ sent: 0 }`.

`npm audit` flags 8 moderate findings after installing `firebase-admin` — all the same transitive `uuid` buffer-bounds advisory, several layers deep inside Google Cloud SDK internals (`google-gax`/`gaxios`/`teeny-request`) used only for internal request-id generation, never fed attacker-controlled input through this app's code paths. `npm audit fix --force` would "fix" it by downgrading `firebase-admin` to a pre-11 release, which is a worse trade — left as-is.

## Android app (Capacitor)

`client/android/` is a real, already-generated native project — app id `com.decoory.client`, app name "Decoory", ink-green (`#1E2622`) + brass (`#A8823C`) "D." launcher icon and splash screen (adaptive icon + legacy + round + dark-mode splash, all densities — generated from the vector sources in `client/assets-src/` via `npx capacitor-assets generate`, not hand-drawn per density). This environment has no JDK/Android SDK, so the actual `./gradlew assembleDebug` compile step has not been run here — everything up through `cap sync` has been verified (clean web build, plugins registered, assets in place).

**Building the APK** (needs [Android Studio](https://developer.android.com/studio) installed, which bundles a JDK and the Android SDK):

```bash
cd client
npm run build              # rebuild the web app into dist/
npx cap sync android       # copy dist/ + plugin native code into the Android project
cd android
./gradlew assembleDebug    # Windows: gradlew.bat assembleDebug
```

The unsigned debug APK lands at `client/android/app/build/outputs/apk/debug/app-debug.apk` — installable directly on a device (`adb install app-debug.apk`) or shareable as-is for testing. Re-run `npm run build && npx cap sync android` after any client source change before rebuilding the APK — Capacitor doesn't watch for changes automatically.

**Push notifications on the device** need a real Firebase project: download `google-services.json` from the Firebase console and place it at `client/android/app/google-services.json` (gitignored — it holds real project credentials) before building. Without it, the app still runs fine; `registerPushNotifications()` (`client/src/shared/push.js`) just won't have a working FCM backend to register against.

**Production (signed, Play Store-ready) builds**, and handing the APK to clients without a store listing, are covered in the deployment docs below.

## Project structure

```
server/       Express API, SQLite DB, seed script
client/       React + Vite app (admin dashboard + client app, role-based routing) — Phase 2/3
android/      Capacitor Android wrapper — Phase 9
```

Full setup, deployment, and APK build docs land in Phase 10.
