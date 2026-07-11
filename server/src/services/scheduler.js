import cron from "node-cron";
import { runMorningBrief, runPaymentReminders, runNightlyRecompute, runSuggestions } from "./jobs.js";

const TZ = { timezone: "Asia/Kolkata" };

export function startScheduler() {
  cron.schedule("0 8 * * *", () => runMorningBrief(), TZ);
  cron.schedule("0 * * * *", () => runPaymentReminders(), TZ);
  cron.schedule("0 2 * * *", () => runNightlyRecompute(), TZ);
  cron.schedule("0 9 * * *", () => runSuggestions().catch((e) => console.error("runSuggestions failed:", e)), TZ);

  console.log("Scheduler started (Asia/Kolkata): morning brief 8AM, payment reminders hourly, nightly recompute 2AM, suggestions check 9AM");
}
