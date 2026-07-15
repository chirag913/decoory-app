import { v4 as uuid } from "uuid";
import db from "../db/index.js";

export function nextLeadCode() {
  const nums = db.prepare("SELECT lead_code FROM leads WHERE lead_code LIKE 'LD-%'").all()
    .map((r) => parseInt(r.lead_code.replace("LD-", ""), 10))
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `LD-${String(next).padStart(3, "0")}`;
}

export const STAGE_LABEL = {
  "new-lead": "New Lead", "attempting-contact": "Attempting Contact", connected: "Connected",
  "visit-scheduled": "Visit Scheduled", "visit-completed": "Visit Completed",
  "quotation-pending": "Quotation Pending", "quotation-sent": "Quotation Sent",
  negotiation: "Negotiation", "advance-received": "Advance Received", won: "Won", lost: "Lost",
};

// Every interaction is recorded here, append-only — no route ever updates or
// deletes a row in lead_activities, so this is always a true history.
// Also bumps leads.last_contact_date for anything that represents genuine
// contact with the lead (not the system-generated 'lead_created' event).
// `createdAt` is only ever passed by the seed script, to backdate demo history.
export function logActivity(leadId, type, note, createdBy, createdAt) {
  const id = uuid();
  const at = createdAt || new Date().toISOString();
  db.prepare("INSERT INTO lead_activities (id, lead_id, type, note, created_by, created_at) VALUES (?,?,?,?,?,?)")
    .run(id, leadId, type, note || null, createdBy || null, at);
  if (type !== "lead_created") {
    db.prepare("UPDATE leads SET last_contact_date = ? WHERE id = ?").run(at, leadId);
  }
  return db.prepare("SELECT * FROM lead_activities WHERE id = ?").get(id);
}

// Shared by every lead-creation entry point (manual add, AI self-estimation,
// chat design-upload) so lead_code assignment and the 'lead_created' activity
// always happen consistently, regardless of where the lead came from.
// `id`/`createdAt` are only ever passed by the seed script.
export function createLead(fields, createdBy) {
  const id = fields.id || uuid();
  const leadCode = nextLeadCode();
  const createdAt = fields.createdAt || new Date().toISOString();
  db.prepare(`
    INSERT INTO leads (
      id, lead_code, name, phone, whatsapp, email, address, city, scope,
      stated_budget_paise, ai_estimate_low_paise, ai_estimate_high_paise, expected_revenue_paise,
      source, status, priority, interest_level, lead_owner, requirements, notes, tags, search_data,
      follow_up_at, site_visit_at, created_at
    ) VALUES (
      @id, @leadCode, @name, @phone, @whatsapp, @email, @address, @city, @scope,
      @statedBudgetPaise, @aiEstimateLowPaise, @aiEstimateHighPaise, @expectedRevenuePaise,
      @source, @status, @priority, @interestLevel, @leadOwner, @requirements, @notes, @tags, @searchData,
      @followUpAt, @siteVisitAt, @createdAt
    )
  `).run({
    id, leadCode, createdAt,
    name: fields.name, phone: fields.phone || null, whatsapp: fields.whatsapp || null,
    email: fields.email || null, address: fields.address || null, city: fields.city || null, scope: fields.scope || null,
    statedBudgetPaise: fields.statedBudgetPaise || null, aiEstimateLowPaise: fields.aiEstimateLowPaise || null,
    aiEstimateHighPaise: fields.aiEstimateHighPaise || null, expectedRevenuePaise: fields.expectedRevenuePaise || null,
    source: fields.source || "manual", status: fields.status || "new-lead",
    priority: fields.priority || "medium", interestLevel: fields.interestLevel || "warm",
    leadOwner: fields.leadOwner || null, requirements: fields.requirements || null, notes: fields.notes || null,
    tags: fields.tags ? JSON.stringify(fields.tags) : null,
    searchData: fields.searchData ? JSON.stringify(fields.searchData) : null,
    followUpAt: fields.followUpAt || null, siteVisitAt: fields.siteVisitAt || null,
  });
  logActivity(id, "lead_created", fields.activityNote || `Captured via ${fields.source || "manual"}`, createdBy || null, createdAt);
  return db.prepare("SELECT * FROM leads WHERE id = ?").get(id);
}
