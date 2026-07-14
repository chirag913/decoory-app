import { Router } from "express";
import { v4 as uuid } from "uuid";
import db from "../db/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as S from "../services/serialize.js";
import { normalizeParams } from "../utils/sql.js";
import { createProjectForClient, ApiError } from "../services/projects.js";
import { now } from "../utils/clock.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  const rows = db.prepare("SELECT * FROM leads ORDER BY created_at DESC").all();
  res.json({ leads: rows.map(S.lead) });
});

router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { name, city, phone, scope, statedBudgetPaise, aiEstimateLowPaise, aiEstimateHighPaise, source, searchData, priority, assignedSalesperson } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const id = uuid();
  db.prepare(`
    INSERT INTO leads (id, name, city, phone, scope, stated_budget_paise, ai_estimate_low_paise, ai_estimate_high_paise, source, status, priority, assigned_salesperson, search_data)
    VALUES (@id,@name,@city,@phone,@scope,@statedBudgetPaise,@aiEstimateLowPaise,@aiEstimateHighPaise,@source,'new-lead',@priority,@assignedSalesperson,@searchData)
  `).run(normalizeParams({
    id, name, city, phone, scope,
    statedBudgetPaise, aiEstimateLowPaise, aiEstimateHighPaise,
    source: source || "manual", priority: priority || "medium", assignedSalesperson,
    searchData: searchData ? JSON.stringify(searchData) : null,
  }));
  res.status(201).json({ lead: S.lead(db.prepare("SELECT * FROM leads WHERE id = ?").get(id)) });
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
    status, name, city, phone, scope, statedBudgetPaise, priority, assignedSalesperson,
    expectedRevenuePaise, followUpAt, siteVisitAt,
  } = req.body;

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
      stated_budget_paise = COALESCE(@statedBudgetPaise, stated_budget_paise),
      priority = COALESCE(@priority, priority),
      assigned_salesperson = CASE WHEN @assignedSalesperson IS NULL THEN assigned_salesperson ELSE NULLIF(@assignedSalesperson, '') END,
      expected_revenue_paise = COALESCE(@expectedRevenuePaise, expected_revenue_paise),
      follow_up_at = CASE WHEN @followUpAt IS NULL THEN follow_up_at ELSE NULLIF(@followUpAt, '') END,
      site_visit_at = CASE WHEN @siteVisitAt IS NULL THEN site_visit_at ELSE NULLIF(@siteVisitAt, '') END,
      converted_project_id = COALESCE(@convertedProjectId, converted_project_id),
      last_activity_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id = @id
  `).run(normalizeParams({
    id: row.id, status, name, city, phone, scope, statedBudgetPaise, priority, assignedSalesperson, expectedRevenuePaise, followUpAt, siteVisitAt,
    convertedProjectId: createdProject?.project.id,
  }));

  const updated = db.prepare("SELECT * FROM leads WHERE id = ?").get(row.id);
  res.json({
    lead: S.lead(updated),
    ...(createdProject ? { project: S.projectDetail(createdProject.project), clientPassword: createdProject.clientPassword, pin: createdProject.pin } : {}),
  });
});

router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  db.prepare("UPDATE projects SET source_lead_id = NULL WHERE source_lead_id = ?").run(req.params.id);
  const result = db.prepare("DELETE FROM leads WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Lead not found" });
  res.status(204).end();
});

export default router;
