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
