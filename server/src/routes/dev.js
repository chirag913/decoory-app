import { Router } from "express";
import { now, advanceMs, resetOffset, getOffsetMs } from "../utils/clock.js";
import { runMorningBrief, runPaymentReminders, runNightlyRecompute, runSuggestions } from "../services/jobs.js";

const router = Router();

// Everything here is test-only: it lets curl/tests fast-forward the app's
// internal clock (see utils/clock.js) and fire cron jobs on demand, instead
// of waiting for real 8AM / hourly ticks to verify the 8AM and reminder-
// window rules. Real request handling (auth, payments, etc.) always uses
// the actual system clock via `now()` — only these dev endpoints move it.
router.get("/time", (req, res) => {
  res.json({ now: now().toISOString(), offsetMs: getOffsetMs() });
});

router.post("/time/advance", (req, res) => {
  const { ms, hours, minutes, days } = req.body || {};
  const delta = (ms || 0) + (hours || 0) * 3600000 + (minutes || 0) * 60000 + (days || 0) * 86400000;
  if (!delta) return res.status(400).json({ error: "Provide ms, hours, minutes, or days to advance by" });
  const offsetMs = advanceMs(delta);
  res.json({ now: now().toISOString(), offsetMs });
});

router.post("/time/reset", (req, res) => {
  resetOffset();
  res.json({ now: now().toISOString(), offsetMs: 0 });
});

router.post("/run/morning-brief", (req, res) => res.json(runMorningBrief()));
router.post("/run/payment-reminders", (req, res) => res.json(runPaymentReminders()));
router.post("/run/nightly", (req, res) => res.json(runNightlyRecompute()));
router.post("/run/suggestions", async (req, res) => res.json(await runSuggestions()));

export default router;
