import { Router } from "express";
import { v4 as uuid } from "uuid";
import db from "../db/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as S from "../services/serialize.js";
import { normalizeParams } from "../utils/sql.js";
import { createProjectForClient, ApiError } from "../services/projects.js";
import { createLead, logActivity, STAGE_LABEL } from "../services/leads.js";
import { now } from "../utils/clock.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), (req, res) => {
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
  } = req.body;

  const VALID_SOURCES = ["self-estimation", "design-upload", "manual", "facebook", "google", "referral", "website"];
  if (source !== undefined && !VALID_SOURCES.includes(source)) {
    return res.status(400).json({ error: `source must be one of: ${VALID_SOURCES.join(", ")}` });
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
      converted_project_id = COALESCE(@convertedProjectId, converted_project_id)
    WHERE id = @id
  `).run(normalizeParams({
    id: row.id, status, name, city, phone, whatsapp, email, address, scope, source, statedBudgetPaise,
    priority, interestLevel, leadOwner, requirements, notes,
    tags: tags !== undefined ? JSON.stringify(tags) : null,
    expectedRevenuePaise, followUpAt, siteVisitAt,
    convertedProjectId: createdProject?.project.id,
  }));

  if (status && status !== row.status) {
    logActivity(row.id, "status_changed", `${STAGE_LABEL[row.status] || row.status} → ${STAGE_LABEL[status] || status}`, req.user.name);
  }
  if (createdProject) {
    logActivity(row.id, "advance_received", `Project ${createdProject.project.code} created`, req.user.name);
  }

  const updated = db.prepare("SELECT * FROM leads WHERE id = ?").get(row.id);
  res.json({
    lead: S.lead(updated),
    ...(createdProject ? { project: S.projectDetail(createdProject.project), clientPassword: createdProject.clientPassword, pin: createdProject.pin } : {}),
  });
});

router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  db.prepare("UPDATE projects SET source_lead_id = NULL WHERE source_lead_id = ?").run(req.params.id);
  db.prepare("DELETE FROM lead_activities WHERE lead_id = ?").run(req.params.id);
  db.prepare("DELETE FROM lead_files WHERE lead_id = ?").run(req.params.id);
  const result = db.prepare("DELETE FROM leads WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Lead not found" });
  res.status(204).end();
});

export default router;
