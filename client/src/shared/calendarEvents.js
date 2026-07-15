// Company-wide calendar (admin/Calendar.jsx). Site Visits and Follow Ups are
// projected server-side from leads' own date fields; the other four types
// live in calendar_events (server/src/db/schema.sql) and are created here.
export const CALENDAR_EVENT_TYPES = [
  { key: "site_visit", label: "Site Visit", color: "#3B82C4", icon: "🏠" },
  { key: "follow_up", label: "Follow Up", color: "#D9A441", icon: "🔁" },
  { key: "installation", label: "Installation", color: "#7C5CBF", icon: "🛠️" },
  { key: "material_delivery", label: "Material Delivery", color: "#2FA88A", icon: "📦" },
  { key: "customer_meeting", label: "Customer Meeting", color: "#D96C9E", icon: "🤝" },
  { key: "quotation_deadline", label: "Quotation Deadline", color: "#D9534F", icon: "📄" },
];

export const CALENDAR_EVENT_META = Object.fromEntries(CALENDAR_EVENT_TYPES.map((t) => [t.key, t]));

// Only these four can be created manually — Site Visit / Follow Up are set
// via the Lead Detail page's quick actions, not directly on the calendar.
export const MANUAL_CALENDAR_TYPES = CALENDAR_EVENT_TYPES.filter(
  (t) => t.key !== "site_visit" && t.key !== "follow_up"
);
