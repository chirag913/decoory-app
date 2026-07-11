import { v4 as uuid } from "uuid";
import db from "../db/index.js";
import { now } from "../utils/clock.js";
import { shouldSendUpcomingReminder, shouldSendOverdueReminder } from "../utils/reminderWindow.js";
import { formatINR } from "../utils/money.js";
import { notify } from "./notify.js";
import { generateUpsellSuggestion } from "./anthropic.js";

const nowIso = () => now().toISOString();

// 8:00 AM daily — in-app + push brief for every project with a plan set.
export function runMorningBrief() {
  const projects = db.prepare("SELECT * FROM projects").all();
  let sent = 0;
  for (const p of projects) {
    if (!p.today_plan) continue;
    notify(p.client_user_id, {
      title: `Good morning! Today at ${p.name}`,
      body: p.today_team ? `${p.today_plan} Team: ${p.today_team}` : p.today_plan,
      type: "morning_brief",
      data: { projectId: p.id },
    });
    sent++;
  }
  return { sent, total: projects.length };
}

// Hourly — hands off to the pure, tested reminderWindow rules for the
// upcoming (6-10hr, 8AM-8PM) and overdue (daily 10AM) cases.
export function runPaymentReminders() {
  const t = now();
  const payments = db.prepare("SELECT * FROM payments WHERE status IN ('upcoming','overdue')").all();
  let sent = 0;
  for (const pay of payments) {
    const shouldSend = pay.status === "upcoming"
      ? shouldSendUpcomingReminder({ dueAt: pay.due_at, reminderSentAt: pay.reminder_sent_at, now: t })
      : shouldSendOverdueReminder({ now: t, reminderSentAt: pay.reminder_sent_at });
    if (!shouldSend) continue;

    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(pay.project_id);
    notify(project.client_user_id, {
      title: pay.status === "overdue" ? "Payment overdue" : "Payment reminder",
      body: `${pay.label} — ${formatINR(pay.amount_paise)} ${pay.status === "overdue" ? "is overdue" : "due soon"}`,
      type: "payment_due",
      data: { projectId: project.id, paymentId: pay.id },
    });
    db.prepare("UPDATE payments SET reminder_sent_at = ? WHERE id = ?").run(nowIso(), pay.id);
    sent++;
  }
  return { sent, checked: payments.length };
}

// Nightly — upcoming -> overdue, and recompute each project's health flag.
export function runNightlyRecompute() {
  const t = now();
  const upcoming = db.prepare("SELECT * FROM payments WHERE status = 'upcoming'").all();
  let overdueCount = 0;
  for (const p of upcoming) {
    if (new Date(p.due_at) < t) {
      db.prepare("UPDATE payments SET status = 'overdue' WHERE id = ?").run(p.id);
      overdueCount++;
    }
  }

  const projects = db.prepare("SELECT * FROM projects").all();
  let healthChanges = 0;
  for (const proj of projects) {
    const hasOverdue = db.prepare("SELECT COUNT(*) c FROM payments WHERE project_id = ? AND status = 'overdue'").get(proj.id).c > 0;
    const pastHandover = proj.handover_date && new Date(proj.handover_date) < t && proj.progress_pct < 100;
    const health = hasOverdue || pastHandover ? "attention" : "on-track";
    if (health !== proj.health) {
      db.prepare("UPDATE projects SET health = ? WHERE id = ?").run(health, proj.id);
      healthChanges++;
    }
  }
  return { overdueCount, healthChanges };
}

// Daily tick, but only acts per-project every 10 days: one AI (or
// rule-based fallback) upsell suggestion + one brand-trust notification.
export async function runSuggestions() {
  const t = now();
  const projects = db.prepare("SELECT * FROM projects").all();
  let created = 0;
  for (const proj of projects) {
    const last = db.prepare("SELECT MAX(created_at) as t FROM suggestions WHERE project_id = ?").get(proj.id).t;
    const daysSince = last ? (t - new Date(last)) / 86400000 : Infinity;
    if (daysSince < 10) continue;

    const materials = db.prepare("SELECT brand FROM materials WHERE project_id = ?").all(proj.id).map((m) => m.brand);
    const priorTitles = db.prepare("SELECT title FROM suggestions WHERE project_id = ?").all(proj.id).map((s) => s.title);
    const suggestion = await generateUpsellSuggestion({ project: proj, materials, excludeTitles: priorTitles });

    db.prepare("INSERT INTO suggestions (id, project_id, title, description, price_note, status) VALUES (?,?,?,?,?, 'sent')")
      .run(uuid(), proj.id, suggestion.title, suggestion.description, suggestion.priceNote || null);
    notify(proj.client_user_id, {
      title: "New idea for your home",
      body: suggestion.title,
      type: "suggestion",
      data: { projectId: proj.id },
    });

    if (materials.length > 0) {
      const brand = materials[Math.floor(Math.random() * materials.length)];
      notify(proj.client_user_id, {
        title: `Trusted brand in your home: ${brand}`,
        body: `${brand} is one of the branded materials Decoory is using in your project — always genuine, always on the BOQ.`,
        type: "brand",
        data: { projectId: proj.id, brand },
      });
    }
    created++;
  }
  return { created, checked: projects.length };
}
