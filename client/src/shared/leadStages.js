// Sales Pipeline stages — single source of truth for the Kanban board
// (admin/SalesPipeline.jsx) and the lead detail drawer's status dropdown.
// 'advance-received' auto-converts the lead into a project server-side
// (see server/src/routes/leads.js).
export const LEAD_STAGES = [
  { key: "new-lead", label: "New Lead" },
  { key: "attempting-contact", label: "Attempting Contact" },
  { key: "connected", label: "Connected" },
  { key: "visit-scheduled", label: "Visit Scheduled" },
  { key: "visit-completed", label: "Visit Completed" },
  { key: "quotation-pending", label: "Quotation Pending" },
  { key: "quotation-sent", label: "Quotation Sent" },
  { key: "negotiation", label: "Negotiation" },
  { key: "advance-received", label: "Advance Received" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

export const LEAD_STAGE_LABEL = Object.fromEntries(LEAD_STAGES.map((s) => [s.key, s.label]));

export const PRIORITIES = ["low", "medium", "high"];
export const INTEREST_LEVELS = ["hot", "warm", "cold"];

// Activity timeline entry types (server/src/db/schema.sql's lead_activities
// CHECK constraint) — every interaction is logged here, append-only, and
// nothing is ever edited or deleted (see server/src/services/leads.js).
export const ACTIVITY_TYPES = [
  { key: "called", label: "Called", icon: "📞" },
  { key: "whatsapp_sent", label: "WhatsApp Sent", icon: "💬" },
  { key: "emailed", label: "Emailed", icon: "✉️" },
  { key: "follow_up", label: "Follow Up", icon: "🔁" },
  { key: "visit_scheduled", label: "Visit Scheduled", icon: "📅" },
  { key: "visit_completed", label: "Visit Completed", icon: "🏠" },
  { key: "quotation_sent", label: "Quotation Sent", icon: "📄" },
  { key: "note", label: "Note", icon: "📝" },
  { key: "other", label: "Other", icon: "•" },
];

export const ACTIVITY_META = {
  lead_created: { label: "Lead Created", icon: "✨" },
  whatsapp_sent: { label: "WhatsApp Sent", icon: "💬" },
  called: { label: "Called", icon: "📞" },
  emailed: { label: "Emailed", icon: "✉️" },
  follow_up: { label: "Follow Up", icon: "🔁" },
  visit_scheduled: { label: "Visit Scheduled", icon: "📅" },
  visit_completed: { label: "Visit Completed", icon: "🏠" },
  quotation_sent: { label: "Quotation Sent", icon: "📄" },
  status_changed: { label: "Status Changed", icon: "➡️" },
  note: { label: "Note", icon: "📝" },
  advance_received: { label: "Advance Received", icon: "💰" },
  other: { label: "Other", icon: "•" },
};
