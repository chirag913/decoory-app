import { Router } from "express";
import { v4 as uuid } from "uuid";
import db from "../db/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as S from "../services/serialize.js";

const router = Router();

const MANUAL_TYPES = ["installation", "material_delivery", "customer_meeting", "quotation_deadline"];

// Aggregates the whole company calendar: Site Visits and Follow Ups are
// projected from leads' own date fields (single source of truth, set via
// the Lead Detail quick actions), closed leads excluded since those dates
// are no longer live commitments. The other four types come straight from
// calendar_events. Every event is annotated with its linked lead/project's
// display name so the client can render + link to it without extra fetches.
router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  const events = [];

  const visits = db.prepare(
    "SELECT id, lead_code, name, site_visit_at FROM leads WHERE site_visit_at IS NOT NULL AND status NOT IN ('won','lost')"
  ).all();
  for (const l of visits) {
    events.push({
      id: `site_visit-${l.id}`, type: "site_visit", title: `Site visit — ${l.name}`,
      eventDate: l.site_visit_at, notes: null, leadId: l.id, projectId: null,
      leadCode: l.lead_code, leadName: l.name,
    });
  }

  const followUps = db.prepare(
    "SELECT id, lead_code, name, follow_up_at FROM leads WHERE follow_up_at IS NOT NULL AND status NOT IN ('won','lost')"
  ).all();
  for (const l of followUps) {
    events.push({
      id: `follow_up-${l.id}`, type: "follow_up", title: `Follow up — ${l.name}`,
      eventDate: l.follow_up_at, notes: null, leadId: l.id, projectId: null,
      leadCode: l.lead_code, leadName: l.name,
    });
  }

  const manual = db.prepare("SELECT * FROM calendar_events ORDER BY event_date").all();
  for (const row of manual) {
    const ev = S.calendarEvent(row);
    if (ev.leadId) {
      const lead = db.prepare("SELECT lead_code, name FROM leads WHERE id = ?").get(ev.leadId);
      if (lead) { ev.leadCode = lead.lead_code; ev.leadName = lead.name; }
    }
    if (ev.projectId) {
      const project = db.prepare("SELECT code, name FROM projects WHERE id = ?").get(ev.projectId);
      if (project) { ev.projectCode = project.code; ev.projectName = project.name; }
    }
    events.push(ev);
  }

  res.json({ events });
});

router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { type, title, eventDate, notes, leadId, projectId } = req.body || {};
  if (!MANUAL_TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${MANUAL_TYPES.join(", ")}` });
  if (!title) return res.status(400).json({ error: "title is required" });
  if (!eventDate) return res.status(400).json({ error: "eventDate is required" });
  if (!leadId && !projectId) return res.status(400).json({ error: "Link this event to a lead or a project" });
  if (leadId && projectId) return res.status(400).json({ error: "Link to a lead or a project, not both" });
  if (leadId && !db.prepare("SELECT id FROM leads WHERE id = ?").get(leadId)) return res.status(404).json({ error: "Lead not found" });
  if (projectId && !db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId)) return res.status(404).json({ error: "Project not found" });

  const id = uuid();
  db.prepare(
    "INSERT INTO calendar_events (id, type, title, event_date, notes, lead_id, project_id, created_by) VALUES (?,?,?,?,?,?,?,?)"
  ).run(id, type, title, eventDate, notes || null, leadId || null, projectId || null, req.user.name);
  res.status(201).json({ event: S.calendarEvent(db.prepare("SELECT * FROM calendar_events WHERE id = ?").get(id)) });
});

router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const result = db.prepare("DELETE FROM calendar_events WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Event not found" });
  res.status(204).end();
});

export default router;
