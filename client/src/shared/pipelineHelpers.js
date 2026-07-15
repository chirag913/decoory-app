// Sales Pipeline usability layer (admin/SalesPipeline.jsx) — Next Action,
// overdue badges, lead age, the daily funnel, priority cards and quick
// filter chips are all pure derivations of existing lead fields (status,
// followUpAt, siteVisitAt, createdAt, interestLevel, source,
// statedBudgetPaise). Nothing here touches the Kanban stages themselves
// (see shared/leadStages.js) or persists new state — nothing here writes
// data; it's read-only.
import { LEAD_STAGES } from "./leadStages.js";

export const TERMINAL_STATUSES = ["won", "lost"];

export function today() {
  return new Date().toISOString().slice(0, 10);
}

function d(dateStr) {
  return dateStr ? dateStr.slice(0, 10) : null;
}

export function leadAge(createdAt) {
  if (!createdAt) return null;
  const days = Math.max(0, Math.round((Date.parse(today()) - Date.parse(d(createdAt))) / 86400000));
  if (days === 0) return { days, label: "Today", icon: "🔥", fg: "#B3452E", bg: "#F6E0DA" };
  if (days <= 3) return { days, label: `${days}d`, icon: "🟡", fg: "#A8741A", bg: "#F6ECD8" };
  if (days <= 7) return { days, label: `${days}d`, icon: "🟠", fg: "#A8571A", bg: "#F3E2D6" };
  if (days <= 15) return { days, label: `${days}d`, icon: "🔴", fg: "#B3452E", bg: "#F6E0DA" };
  return { days, label: `${days}d`, icon: "⚫", fg: "#4A473F", bg: "#E9E6DC" };
}

// Every non-terminal lead should always show exactly one actionable next
// step — this is the single source of truth for it (Kanban card + Sales
// Queue panel both call this so they can never disagree).
export function nextAction(lead) {
  if (TERMINAL_STATUSES.includes(lead.status)) return null;
  const followDue = lead.followUpAt && d(lead.followUpAt) <= today();
  const visitDate = d(lead.siteVisitAt);

  switch (lead.status) {
    case "new-lead":
      return { icon: "📞", label: "Call Customer" };
    case "attempting-contact":
      return followDue ? { icon: "🔁", label: "Follow-up" } : { icon: "📞", label: "Call Customer" };
    case "connected":
      return visitDate ? { icon: "📅", label: visitDate <= today() ? "Visit Today" : "Visit Scheduled" } : { icon: "📅", label: "Schedule Visit" };
    case "visit-scheduled":
      if (!visitDate) return { icon: "📅", label: "Schedule Visit" };
      if (visitDate < today()) return { icon: "📅", label: "Visit Overdue" };
      if (visitDate === today()) return { icon: "📅", label: "Visit Today" };
      return { icon: "📅", label: "Visit Scheduled" };
    case "visit-completed":
      return { icon: "📄", label: "Send Quotation" };
    case "quotation-pending":
      return { icon: "📄", label: "Send Quotation" };
    case "quotation-sent":
      return followDue ? { icon: "🔁", label: "Follow-up" } : { icon: "⏳", label: "Waiting Customer Response" };
    case "negotiation":
      return followDue ? { icon: "🔁", label: "Follow-up" } : { icon: "💰", label: "Collect Advance" };
    case "advance-received":
      return { icon: "💰", label: "Collect Advance" };
    default:
      return { icon: "🔁", label: "Follow-up" };
  }
}

// Only one badge per card — priority order matches urgency/severity.
export function overdueBadge(lead) {
  if (TERMINAL_STATUSES.includes(lead.status)) return null;
  if (lead.followUpAt && d(lead.followUpAt) < today()) {
    return { icon: "🔴", label: "FOLLOW-UP OVERDUE", bg: "#F6E0DA", fg: "#B3452E" };
  }
  if (lead.siteVisitAt && d(lead.siteVisitAt) === today() && lead.status === "visit-scheduled") {
    return { icon: "🟣", label: "VISIT TODAY", bg: "#EAE4F2", fg: "#6B4FA1" };
  }
  if (["visit-completed", "quotation-pending"].includes(lead.status)) {
    return { icon: "🟡", label: "QUOTATION DUE", bg: "#F6ECD8", fg: "#A8741A" };
  }
  if (lead.status === "negotiation") {
    return { icon: "🟢", label: "ADVANCE EXPECTED", bg: "#E4EFE8", fg: "#3E7A5B" };
  }
  return null;
}

// "Today's Priorities" cards — each is also a quick filter (clicking one
// toggles the same key used by the Quick Filters row below the funnel).
export const PRIORITY_CARDS = [
  { key: "new-first-call", icon: "🔴", label: "New Leads Awaiting First Call", match: (l) => l.status === "new-lead" },
  { key: "followups-due", icon: "🟠", label: "Follow-ups Due Today", match: (l) => l.followUpAt && d(l.followUpAt) <= today() && !TERMINAL_STATUSES.includes(l.status) },
  { key: "site-visits-today", icon: "🟣", label: "Site Visits Today", match: (l) => l.siteVisitAt && d(l.siteVisitAt) === today() && !TERMINAL_STATUSES.includes(l.status) },
  { key: "quotations-due", icon: "🟡", label: "Quotations Due Today", match: (l) => ["visit-completed", "quotation-pending"].includes(l.status) },
  { key: "advances-expected", icon: "🟢", label: "Advances Expected Today", match: (l) => l.status === "negotiation" },
];

export const QUICK_FILTERS = [
  { key: "f-today", label: "Today", match: (l) => (l.followUpAt && d(l.followUpAt) === today()) || (l.siteVisitAt && d(l.siteVisitAt) === today()) },
  { key: "f-overdue", label: "Overdue", match: (l) => l.followUpAt && d(l.followUpAt) < today() && !TERMINAL_STATUSES.includes(l.status) },
  { key: "f-mine", label: "My Leads", match: (l, ctx) => !!ctx?.userName && l.leadOwner === ctx.userName },
  { key: "f-hot", label: "Hot", match: (l) => l.interestLevel === "hot" },
  { key: "f-warm", label: "Warm", match: (l) => l.interestLevel === "warm" },
  { key: "f-cold", label: "Cold", match: (l) => l.interestLevel === "cold" },
  { key: "f-facebook", label: "Facebook", match: (l) => l.source === "facebook" },
  { key: "f-google", label: "Google", match: (l) => l.source === "google" },
  { key: "f-referral", label: "Referral", match: (l) => l.source === "referral" },
  { key: "f-high-budget", label: "High Budget (>20L)", match: (l) => (l.statedBudgetPaise || 0) > 2000000 * 100 },
  { key: "f-site-visits", label: "Site Visits", match: (l) => !!l.siteVisitAt && l.status === "visit-scheduled" },
  { key: "f-quotation-pending", label: "Quotation Pending", match: (l) => l.status === "quotation-pending" },
];

export const ALL_FILTERS = [...PRIORITY_CARDS, ...QUICK_FILTERS];

export function leadMatchesFilters(lead, activeKeys, ctx) {
  if (!activeKeys.size) return true;
  for (const key of activeKeys) {
    const def = ALL_FILTERS.find((f) => f.key === key);
    if (def && !def.match(lead, ctx)) return false;
  }
  return true;
}

// Sales Funnel — cumulative depth of the *current* pipeline (how many
// non-lost leads have reached at least this stage), not a single day's
// cohort — there usually aren't enough same-day leads to fill 8 steps.
export const FUNNEL_STEPS = [
  { label: "New Leads", stage: "new-lead" },
  { label: "Contacted", stage: "attempting-contact" },
  { label: "Qualified", stage: "connected" },
  { label: "Visits Scheduled", stage: "visit-scheduled" },
  { label: "Visits Completed", stage: "visit-completed" },
  { label: "Quotations Sent", stage: "quotation-sent" },
  { label: "Negotiation", stage: "negotiation" },
  { label: "Advance Received", stage: "advance-received" },
];

const STAGE_ORDER = Object.fromEntries(LEAD_STAGES.map((s, i) => [s.key, i]));

export function computeFunnel(leads) {
  const active = leads.filter((l) => l.status !== "lost");
  return FUNNEL_STEPS.map((step) => ({
    ...step,
    count: active.filter((l) => STAGE_ORDER[l.status] >= STAGE_ORDER[step.stage]).length,
  }));
}

export const LOST_REASONS = ["Too Expensive", "No Response", "Competitor", "Budget Issue", "Postponed", "Location", "Other"];

// Sales Queue — every non-terminal lead with its next action, most urgent
// first. Fully derived, so completing the underlying action (which changes
// the lead's status/followUpAt/siteVisitAt) removes it from this list the
// next time leads are reloaded — no separate task-tracking state to manage.
export function buildSalesQueue(leads) {
  return leads
    .filter((l) => !TERMINAL_STATUSES.includes(l.status))
    .map((l) => ({ lead: l, action: nextAction(l), badge: overdueBadge(l) }))
    .filter((t) => t.action)
    .sort((a, b) => {
      const rank = (t) => (t.badge?.label === "FOLLOW-UP OVERDUE" ? 0 : t.badge ? 1 : 2);
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      return (a.lead.followUpAt || a.lead.siteVisitAt || "9999").localeCompare(b.lead.followUpAt || b.lead.siteVisitAt || "9999");
    });
}
