// Company-wide calendar (admin/Calendar.jsx) — scheduled-date markers tied
// directly to the Sales Pipeline. Site Visits and Follow Ups are projected
// server-side from leads' own date fields (site_visit_at/follow_up_at).
// Day-by-day pipeline *activity* (new leads, closed, quotations sent, etc.)
// is a separate concept — see shared/pipelineHelpers.js's DAY_ACTIVITY_TYPES.
export const CALENDAR_EVENT_TYPES = [
  { key: "site_visit", label: "Site Visit", color: "#3B82C4", icon: "🏠" },
  { key: "follow_up", label: "Follow Up", color: "#D9A441", icon: "🔁" },
];

export const CALENDAR_EVENT_META = Object.fromEntries(CALENDAR_EVENT_TYPES.map((t) => [t.key, t]));
