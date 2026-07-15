import { Router } from "express";
import { v4 as uuid } from "uuid";
import db from "../db/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as S from "../services/serialize.js";
import { normalizeParams } from "../utils/sql.js";
import { createProjectForClient, ApiError } from "../services/projects.js";
import { createLead, logActivity, STAGE_LABEL, ATTEMPT_DELAYS_MIN } from "../services/leads.js";
import { now } from "../utils/clock.js";
import { notifyAllAdmins } from "../services/notify.js";

const router = Router();

// Snooze reconciliation (Rule 10): a snoozed lead is hidden from the active
// Sales Queue/Kanban until its wake-up date. Rather than run a separate cron
// job, every list fetch lazily reactivates any lead whose snoozed_until has
// arrived — clears the snooze, logs it, and raises a notification so it's
// impossible to miss. Cheap since it's already iterating every lead.
function reconcileSnoozes() {
  const today = new Date().toISOString().slice(0, 10);
  const due = db.prepare("SELECT * FROM leads WHERE snoozed_until IS NOT NULL AND snoozed_until <= ?").all(today);
  for (const lead of due) {
    db.prepare("UPDATE leads SET snoozed_until = NULL, snooze_reason = NULL WHERE id = ?").run(lead.id);
    logActivity(lead.id, "note", "Snoozed lead reactivated for follow-up", "System");
    notifyAllAdmins({
      title: "Snoozed lead ready for follow-up",
      body: `${lead.name} (${lead.lead_code}) is back in the queue.`,
      type: "lead",
      data: { leadId: lead.id },
    });
  }
}

router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  reconcileSnoozes();
  const rows = db.prepare("SELECT * FROM leads ORDER BY created_at DESC").all();
  res.json({ leads: rows.map(S.lead) });
});

router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const lead = createLead(req.body, req.user.name);
  res.status(201).json({ lead: S.lead(lead) });
});

// ── Activity timeline (append-only — see services/leads.js) ──
function getLeadOr404(req, res) {
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  if (!lead) { res.status(404).json({ error: "Lead not found" }); return null; }
  return lead;
}

router.get("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const lead = getLeadOr404(req, res);
  if (!lead) return;
  res.json({ lead: S.lead(lead) });
});

// ── Files (lead detail page's "Files" panel — reuses POST /api/uploads) ──
router.get("/:id/files", requireAuth, requireRole("admin"), (req, res) => {
  const lead = getLeadOr404(req, res);
  if (!lead) return;
  const rows = db.prepare("SELECT * FROM lead_files WHERE lead_id = ? ORDER BY created_at DESC").all(lead.id);
  res.json({ files: rows.map(S.leadFile) });
});

router.post("/:id/files", requireAuth, requireRole("admin"), (req, res) => {
  const lead = getLeadOr404(req, res);
  if (!lead) return;
  const { filePath, fileName, kind } = req.body;
  if (!filePath) return res.status(400).json({ error: "filePath is required — upload via POST /api/uploads first" });
  const id = uuid();
  db.prepare("INSERT INTO lead_files (id, lead_id, file_path, file_name, kind, uploaded_by) VALUES (?,?,?,?,?,?)")
    .run(id, lead.id, filePath, fileName || null, kind === "video" ? "video" : "photo", req.user.name);
  res.status(201).json({ file: S.leadFile(db.prepare("SELECT * FROM lead_files WHERE id = ?").get(id)) });
});

router.delete("/:id/files/:fileId", requireAuth, requireRole("admin"), (req, res) => {
  const result = db.prepare("DELETE FROM lead_files WHERE id = ? AND lead_id = ?").run(req.params.fileId, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "File not found" });
  res.status(204).end();
});

router.get("/:id/activities", requireAuth, requireRole("admin"), (req, res) => {
  const lead = getLeadOr404(req, res);
  if (!lead) return;
  const rows = db.prepare("SELECT * FROM lead_activities WHERE lead_id = ? ORDER BY created_at DESC").all(lead.id);
  res.json({ activities: rows.map(S.leadActivity) });
});

router.post("/:id/activities", requireAuth, requireRole("admin"), (req, res) => {
  const lead = getLeadOr404(req, res);
  if (!lead) return;
  const { type, note } = req.body;
  const VALID_TYPES = ["lead_created", "whatsapp_sent", "called", "emailed", "follow_up", "visit_scheduled", "visit_completed", "quotation_sent", "status_changed", "note", "advance_received", "other"];
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(", ")}` });
  const activity = logActivity(lead.id, type, note, req.user.name);
  res.status(201).json({ activity: S.leadActivity(activity), lead: S.lead(db.prepare("SELECT * FROM leads WHERE id = ?").get(lead.id)) });
});

// Soft-void toggle: the only mutation ever allowed on an activity row. Never
// touches type/note/created_at, so the timeline stays a true history — a
// voided entry is still there, just excluded from things like Quotation
// History and shown greyed-out. Toggles based on current state so a misclick
// can be undone.
router.post("/:id/activities/:activityId/void", requireAuth, requireRole("admin"), (req, res) => {
  const activity = db.prepare("SELECT * FROM lead_activities WHERE id = ? AND lead_id = ?").get(req.params.activityId, req.params.id);
  if (!activity) return res.status(404).json({ error: "Activity not found" });
  if (activity.voided_at) {
    db.prepare("UPDATE lead_activities SET voided_at = NULL, voided_by = NULL WHERE id = ?").run(activity.id);
  } else {
    db.prepare("UPDATE lead_activities SET voided_at = ?, voided_by = ? WHERE id = ?").run(new Date().toISOString(), req.user.name, activity.id);
  }
  res.json({ activity: S.leadActivity(db.prepare("SELECT * FROM lead_activities WHERE id = ?").get(activity.id)) });
});

// A full name's last word, for the auto-generated project name convention
// ("Rakesh Sharma" -> "Sharma Residence") — matches the existing seed data.
function surname(name) {
  const parts = (name || "").trim().split(/\s+/);
  return parts[parts.length - 1] || name;
}

// Sales Pipeline -> Projects: dragging/setting a lead to 'advance-received'
// auto-creates the project + client login, exactly like the manual "+ New
// project" form does, sourced from the lead's own data.
function convertLeadToProject(lead) {
  return createProjectForClient({
    name: `${surname(lead.name)} Residence`,
    type: [lead.scope, lead.city].filter(Boolean).join(" · ") || "Interior project",
    budgetPaise: lead.expected_revenue_paise || lead.stated_budget_paise,
    startDate: now().toISOString().slice(0, 10),
    client: { name: lead.name, phone: lead.phone },
    sourceLeadId: lead.id,
  });
}

router.patch("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const row = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Lead not found" });
  const {
    status, name, phone, whatsapp, email, address, city, scope, statedBudgetPaise,
    priority, interestLevel, leadOwner, requirements, notes, tags, expectedRevenuePaise, followUpAt, siteVisitAt, source,
    lostReason, snoozedUntil, snoozeReason,
  } = req.body;

  const VALID_SOURCES = ["self-estimation", "design-upload", "manual", "facebook", "google", "referral", "website"];
  if (source !== undefined && !VALID_SOURCES.includes(source)) {
    return res.status(400).json({ error: `source must be one of: ${VALID_SOURCES.join(", ")}` });
  }

  // Lost Lead Analytics: the Sales Pipeline's own drag-to-Lost flow always
  // prompts for a reason (enforced in the UI, not here) — kept optional at
  // the API level so other callers that set status:'lost' without a reason
  // (e.g. the Lead Detail page's "Mark Lost" button) keep working unchanged.
  const VALID_LOST_REASONS = [
    "Too Expensive", "No Response", "Competitor", "Budget Issue", "Postponed", "Location",
    "Wrong Number", "Duplicate Lead", "Fake / Spam", "Outside Service Area", "Already Finalized",
    "No Requirement", "Wrong Timing", "Language Barrier", "Other",
  ];
  if (lostReason !== undefined && lostReason !== null && !VALID_LOST_REASONS.includes(lostReason)) {
    return res.status(400).json({ error: `lostReason must be one of: ${VALID_LOST_REASONS.join(", ")}` });
  }

  // Validate + create the project BEFORE touching the lead row, so a failed
  // conversion (missing phone/budget) leaves the lead completely unchanged
  // rather than stuck showing "Advance Received" with no project behind it.
  let createdProject = null;
  if (status === "advance-received" && !row.converted_project_id) {
    const effectivePhone = phone !== undefined ? phone : row.phone;
    const effectiveBudget = (expectedRevenuePaise !== undefined ? expectedRevenuePaise : row.expected_revenue_paise)
      || (statedBudgetPaise !== undefined ? statedBudgetPaise : row.stated_budget_paise);
    if (!effectivePhone) return res.status(400).json({ error: "Add a phone number for this lead before marking Advance Received — a project needs a client login." });
    if (!effectiveBudget) return res.status(400).json({ error: "Set an expected revenue or budget before marking Advance Received." });

    try {
      createdProject = convertLeadToProject({
        ...row,
        name: name || row.name,
        phone: effectivePhone,
        scope: scope !== undefined ? scope : row.scope,
        city: city !== undefined ? city : row.city,
        expected_revenue_paise: expectedRevenuePaise !== undefined ? expectedRevenuePaise : row.expected_revenue_paise,
        stated_budget_paise: statedBudgetPaise !== undefined ? statedBudgetPaise : row.stated_budget_paise,
      });
    } catch (err) {
      if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
      throw err;
    }
  }

  db.prepare(`
    UPDATE leads SET
      status = COALESCE(@status, status), name = COALESCE(@name, name),
      city = COALESCE(@city, city), phone = COALESCE(@phone, phone), scope = COALESCE(@scope, scope),
      source = COALESCE(@source, source),
      whatsapp = CASE WHEN @whatsapp IS NULL THEN whatsapp ELSE NULLIF(@whatsapp, '') END,
      email = CASE WHEN @email IS NULL THEN email ELSE NULLIF(@email, '') END,
      address = CASE WHEN @address IS NULL THEN address ELSE NULLIF(@address, '') END,
      stated_budget_paise = COALESCE(@statedBudgetPaise, stated_budget_paise),
      priority = COALESCE(@priority, priority),
      interest_level = COALESCE(@interestLevel, interest_level),
      lead_owner = CASE WHEN @leadOwner IS NULL THEN lead_owner ELSE NULLIF(@leadOwner, '') END,
      requirements = CASE WHEN @requirements IS NULL THEN requirements ELSE NULLIF(@requirements, '') END,
      notes = CASE WHEN @notes IS NULL THEN notes ELSE NULLIF(@notes, '') END,
      tags = COALESCE(@tags, tags),
      expected_revenue_paise = COALESCE(@expectedRevenuePaise, expected_revenue_paise),
      follow_up_at = CASE WHEN @followUpAt IS NULL THEN follow_up_at ELSE NULLIF(@followUpAt, '') END,
      site_visit_at = CASE WHEN @siteVisitAt IS NULL THEN site_visit_at ELSE NULLIF(@siteVisitAt, '') END,
      lost_reason = COALESCE(@lostReason, lost_reason),
      snoozed_until = CASE WHEN @snoozedUntil IS NULL THEN snoozed_until ELSE NULLIF(@snoozedUntil, '') END,
      snooze_reason = CASE WHEN @snoozeReason IS NULL THEN snooze_reason ELSE NULLIF(@snoozeReason, '') END,
      converted_project_id = COALESCE(@convertedProjectId, converted_project_id)
    WHERE id = @id
  `).run(normalizeParams({
    id: row.id, status, name, city, phone, whatsapp, email, address, scope, source, statedBudgetPaise,
    priority, interestLevel, leadOwner, requirements, notes,
    tags: tags !== undefined ? JSON.stringify(tags) : null,
    expectedRevenuePaise, followUpAt, siteVisitAt,
    lostReason: status === "lost" ? lostReason : undefined,
    snoozedUntil, snoozeReason,
    convertedProjectId: createdProject?.project.id,
  }));

  // Manual snooze/un-snooze (Rule 10's dedicated action, distinct from the
  // automatic snooze the Call Outcome "Not Interested" flow can trigger).
  if (snoozedUntil !== undefined) {
    logActivity(row.id, "note", snoozedUntil ? `Snoozed until ${snoozedUntil}${snoozeReason ? ` — ${snoozeReason}` : ""}` : "Un-snoozed", req.user.name);
  }

  if (status && status !== row.status) {
    const note = status === "lost" && lostReason
      ? `${STAGE_LABEL[row.status] || row.status} → ${STAGE_LABEL[status] || status} — ${lostReason}`
      : `${STAGE_LABEL[row.status] || row.status} → ${STAGE_LABEL[status] || status}`;
    logActivity(row.id, "status_changed", note, req.user.name);
  }
  if (createdProject) {
    logActivity(row.id, "advance_received", `Project ${createdProject.project.code} created`, req.user.name);
    // Rule 9 (Advance Received): if the amount/date were captured, record the
    // advance as an already-paid milestone on the new project immediately —
    // it shouldn't show up as "due" when the client first logs in.
    const { advanceAmountPaise, advancePaymentMethod, advancePaidAt } = req.body;
    if (advanceAmountPaise && advancePaidAt) {
      db.prepare(
        "INSERT INTO payments (id, project_id, label, amount_paise, due_at, status, paid_at) VALUES (?,?,?,?,?,?,?)"
      ).run(
        uuid(), createdProject.project.id,
        `Booking advance${advancePaymentMethod ? ` — ${advancePaymentMethod}` : ""}`,
        advanceAmountPaise, advancePaidAt, "paid", advancePaidAt
      );
    }
  }

  const updated = db.prepare("SELECT * FROM leads WHERE id = ?").get(row.id);
  res.json({
    lead: S.lead(updated),
    ...(createdProject ? { project: S.projectDetail(createdProject.project), clientPassword: createdProject.clientPassword, pin: createdProject.pin } : {}),
  });
});

// ── Call Outcome system ──────────────────────────────────────────────
// The sales team should only ever record *what happened* on a call —
// everything else (stage, next action, follow-up date, attempt count,
// temperature) is derived here, server-side, so every entry point into
// the pipeline applies the same rules consistently. See CALL_OUTCOMES
// below for the fixed menu; each case implements one rule from the spec.
const CALL_OUTCOMES = [
  "no-response", "busy", "call-back-later", "interested", "site-visit-booked",
  "not-interested", "wrong-number", "duplicate-lead", "fake-spam",
  "outside-service-area", "already-finalized", "other",
];

const CLOSE_REASON = {
  "wrong-number": "Wrong Number", "duplicate-lead": "Duplicate Lead", "fake-spam": "Fake / Spam",
  "outside-service-area": "Outside Service Area", "already-finalized": "Already Finalized",
};

function addMinutesIso(min) {
  return new Date(Date.now() + min * 60000).toISOString();
}

router.post("/:id/call-outcome", requireAuth, requireRole("admin"), (req, res) => {
  const lead = getLeadOr404(req, res);
  if (!lead) return;
  const { outcome, ...f } = req.body || {};
  if (!CALL_OUTCOMES.includes(outcome)) {
    return res.status(400).json({ error: `outcome must be one of: ${CALL_OUTCOMES.join(", ")}` });
  }

  const patch = {};
  let activityType = "called";
  let activityNote = "";
  const advanceStage = () => { if (lead.status === "new-lead") patch.status = "attempting-contact"; };

  switch (outcome) {
    case "no-response": {
      const attempt = (lead.attempt_count || 0) + 1;
      patch.attempt_count = attempt;
      advanceStage();
      const delay = ATTEMPT_DELAYS_MIN[Math.min(attempt, ATTEMPT_DELAYS_MIN.length) - 1];
      patch.follow_up_at = addMinutesIso(delay);
      if (attempt > ATTEMPT_DELAYS_MIN.length) patch.interest_level = "cold";
      activityNote = `Call attempt ${attempt} — No Response`;
      break;
    }
    case "busy": {
      const { when, customDate } = f;
      const date = when === "today" ? new Date().toISOString().slice(0, 10)
        : when === "tomorrow" ? addMinutesIso(24 * 60).slice(0, 10)
        : customDate;
      if (!date) return res.status(400).json({ error: "date is required" });
      patch.follow_up_at = date;
      advanceStage();
      activityNote = `Busy — call again ${date}`;
      break;
    }
    case "call-back-later": {
      const { reason, date, time } = f;
      if (!date) return res.status(400).json({ error: "date is required" });
      patch.follow_up_at = time ? new Date(`${date}T${time}:00+05:30`).toISOString() : date;
      advanceStage();
      activityNote = reason ? `Call back later — ${reason}` : "Call back later";
      break;
    }
    case "interested": {
      patch.status = "connected";
      patch.interest_level = lead.interest_level === "cold" ? "warm" : lead.interest_level;
      activityNote = "Interested";
      break;
    }
    case "site-visit-booked": {
      const { visitDate, visitTime, assignedStaff, address, notes } = f;
      if (!visitDate) return res.status(400).json({ error: "visitDate is required" });
      patch.status = "visit-scheduled";
      patch.site_visit_at = visitTime ? new Date(`${visitDate}T${visitTime}:00+05:30`).toISOString() : visitDate;
      if (address) patch.address = address;
      if (assignedStaff) patch.lead_owner = assignedStaff;
      activityType = "visit_scheduled";
      activityNote = `Site visit scheduled for ${visitDate}${visitTime ? " " + visitTime : ""}${assignedStaff ? " — " + assignedStaff : ""}${notes ? ` (${notes})` : ""}`;
      break;
    }
    case "not-interested": {
      const { lostReason, followUp3Months } = f;
      if (!lostReason) return res.status(400).json({ error: "lostReason is required" });
      if (followUp3Months) {
        patch.snoozed_until = addMinutesIso(90 * 24 * 60).slice(0, 10);
        patch.snooze_reason = `Not interested — ${lostReason}`;
        activityType = "note";
        activityNote = `Not interested (${lostReason}) — snoozed 3 months`;
      } else {
        patch.status = "lost";
        patch.lost_reason = lostReason;
        activityType = "status_changed";
        activityNote = `${STAGE_LABEL[lead.status] || lead.status} → Closed — ${lostReason}`;
      }
      break;
    }
    case "wrong-number": case "duplicate-lead": case "fake-spam": case "outside-service-area": case "already-finalized": {
      patch.status = "lost";
      patch.lost_reason = CLOSE_REASON[outcome];
      activityType = "status_changed";
      activityNote = `${STAGE_LABEL[lead.status] || lead.status} → Closed — ${CLOSE_REASON[outcome]}`;
      break;
    }
    case "other": {
      activityType = "note";
      activityNote = f.note?.trim() || "Other call outcome";
      break;
    }
  }

  const keys = Object.keys(patch);
  if (keys.length) {
    db.prepare(`UPDATE leads SET ${keys.map((k) => `${k} = @${k}`).join(", ")} WHERE id = @id`).run({ ...patch, id: lead.id });
  }
  logActivity(lead.id, activityType, activityNote, req.user.name);

  res.json({ lead: S.lead(db.prepare("SELECT * FROM leads WHERE id = ?").get(lead.id)) });
});

router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  db.prepare("UPDATE projects SET source_lead_id = NULL WHERE source_lead_id = ?").run(req.params.id);
  db.prepare("DELETE FROM lead_activities WHERE lead_id = ?").run(req.params.id);
  db.prepare("DELETE FROM lead_files WHERE lead_id = ?").run(req.params.id);
  db.prepare("DELETE FROM calendar_events WHERE lead_id = ?").run(req.params.id);
  const result = db.prepare("DELETE FROM leads WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Lead not found" });
  res.status(204).end();
});

export default router;
