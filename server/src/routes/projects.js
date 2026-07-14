import { Router } from "express";
import { v4 as uuid } from "uuid";
import db from "../db/index.js";
import { requireAuth, requireRole, loadOwnProject } from "../middleware/auth.js";
import { notify } from "../services/notify.js";
import { recomputeProgress } from "../services/progress.js";
import { createProjectForClient, ApiError } from "../services/projects.js";
import { createLead } from "../services/leads.js";
import * as S from "../services/serialize.js";

const router = Router();

function getProjectOr404(req, res) {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return null;
  }
  if (req.user.role === "client" && project.client_user_id !== req.user.id) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return project;
}

// GET /api/projects — admin: all projects; client: own project only
router.get("/", requireAuth, (req, res) => {
  const rows = req.user.role === "admin"
    ? db.prepare("SELECT * FROM projects ORDER BY created_at DESC").all()
    : db.prepare("SELECT * FROM projects WHERE client_user_id = ?").all(req.user.id);
  res.json({ projects: rows.map(S.projectDetail) });
});

// POST /api/projects — onboards a new client: creates their login account
// and their project together, since every project needs a client_user_id.
// code/pin auto-generate if omitted (code: next DCR-1xx; pin: random 4
// digits) — both can be overridden, e.g. to match a PIN already told to
// the client at booking before this got entered into the system.
router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { code, name, type, budgetPaise, startDate, handoverDate, pin, client } = req.body || {};
  try {
    const { project, clientPassword, pin: finalPin } = createProjectForClient({ code, name, type, budgetPaise, startDate, handoverDate, pin, client });
    res.status(201).json({ project: S.projectDetail(project), clientPassword, pin: finalPin });
  } catch (err) {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

router.get("/me", requireAuth, requireRole("client"), loadOwnProject, (req, res) => {
  res.json({ project: S.projectDetail(req.project) });
});

router.get("/:id", requireAuth, (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  res.json({ project: S.projectDetail(project) });
});

// PATCH /api/projects/:id — admin: update today's plan/team, stage, progress, health
router.patch("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const fields = {
    today_plan: req.body.todayPlan, today_team: req.body.todayTeam,
    current_stage: req.body.currentStage, progress_pct: req.body.progressPct,
    health: req.body.health, handover_date: req.body.handoverDate,
  };
  const sets = [];
  const values = {};
  for (const [col, val] of Object.entries(fields)) {
    if (val !== undefined) { sets.push(`${col} = @${col}`); values[col] = val; }
  }
  if (sets.length === 0) return res.status(400).json({ error: "No fields to update" });
  values.id = project.id;
  db.prepare(`UPDATE projects SET ${sets.join(", ")} WHERE id = @id`).run(values);
  res.json({ project: S.projectDetail(db.prepare("SELECT * FROM projects WHERE id = ?").get(project.id)) });
});

// ── Milestones (drive progress_pct — see services/progress.js) ──
router.get("/:id/milestones", requireAuth, (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  const rows = db.prepare("SELECT * FROM milestones WHERE project_id = ? ORDER BY sort_order ASC, created_at ASC").all(project.id);
  res.json({ milestones: rows.map(S.milestone) });
});

router.post("/:id/milestones", requireAuth, requireRole("admin"), (req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  const title = (req.body.title || "").trim();
  if (!title) return res.status(400).json({ error: "title is required" });
  const nextOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 as n FROM milestones WHERE project_id = ?").get(project.id).n;
  const id = uuid();
  db.prepare("INSERT INTO milestones (id, project_id, title, sort_order) VALUES (?,?,?,?)").run(id, project.id, title, nextOrder);
  recomputeProgress(project.id);
  res.status(201).json({ milestone: S.milestone(db.prepare("SELECT * FROM milestones WHERE id = ?").get(id)) });
});

// ── Daily updates ──
router.get("/:id/updates", requireAuth, (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  const rows = db.prepare("SELECT * FROM daily_updates WHERE project_id = ? ORDER BY update_date DESC, created_at DESC").all(project.id);
  res.json({ updates: rows.map(S.dailyUpdate) });
});

router.post("/:id/updates", requireAuth, requireRole("admin"), (req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  const { date, items, media } = req.body;
  if (!date || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "date and a non-empty items[] are required" });
  }
  const id = uuid();
  db.prepare("INSERT INTO daily_updates (id, project_id, update_date, items) VALUES (?,?,?,?)")
    .run(id, project.id, date, JSON.stringify(items));
  if (Array.isArray(media)) {
    const insertMedia = db.prepare("INSERT INTO update_media (id, update_id, file_path, kind) VALUES (?,?,?,?)");
    for (const m of media) insertMedia.run(uuid(), id, m.filePath, m.kind || "photo");
  }
  notify(project.client_user_id, {
    title: "New site update posted",
    body: items[0] + (items.length > 1 ? ` · +${items.length - 1} more` : ""),
    type: "update",
    data: { projectId: project.id, updateId: id },
  });
  const row = db.prepare("SELECT * FROM daily_updates WHERE id = ?").get(id);
  res.status(201).json({ update: S.dailyUpdate(row) });
});

// ── Payments (scoped to one project) ──
router.get("/:id/payments", requireAuth, (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  const rows = db.prepare("SELECT * FROM payments WHERE project_id = ? ORDER BY due_at ASC").all(project.id);
  res.json({ payments: rows.map(S.payment) });
});

router.post("/:id/payments", requireAuth, requireRole("admin"), (req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  const { label, amountPaise, dueAt, status } = req.body;
  if (!label || !amountPaise || !dueAt) return res.status(400).json({ error: "label, amountPaise, dueAt are required" });
  const id = uuid();
  db.prepare("INSERT INTO payments (id, project_id, label, amount_paise, due_at, status) VALUES (?,?,?,?,?,?)")
    .run(id, project.id, label, amountPaise, dueAt, status || "scheduled");
  res.status(201).json({ payment: S.payment(db.prepare("SELECT * FROM payments WHERE id = ?").get(id)) });
});

// ── Team ──
router.get("/:id/team", requireAuth, (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  const rows = db.prepare(`
    SELECT tm.* FROM team_members tm
    JOIN project_team pt ON pt.team_member_id = tm.id
    WHERE pt.project_id = ?
  `).all(project.id);
  res.json({ team: rows.map(S.teamMember) });
});

// ── Materials ──
router.get("/:id/materials", requireAuth, (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  const rows = db.prepare("SELECT * FROM materials WHERE project_id = ?").all(project.id);
  res.json({ materials: rows.map(S.material) });
});

// ── Suggestions ──
router.get("/:id/suggestions", requireAuth, (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  const rows = db.prepare("SELECT * FROM suggestions WHERE project_id = ? ORDER BY created_at DESC").all(project.id);
  res.json({ suggestions: rows.map(S.suggestion) });
});

// ── Messages ──
router.get("/:id/messages", requireAuth, (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  const rows = db.prepare("SELECT * FROM messages WHERE project_id = ? ORDER BY created_at ASC").all(project.id);
  res.json({ messages: rows.map(S.message) });
});

router.post("/:id/messages", requireAuth, (req, res) => {
  const project = getProjectOr404(req, res);
  if (!project) return;
  const { text, attachmentPath } = req.body;
  if (!text && !attachmentPath) return res.status(400).json({ error: "text or attachmentPath required" });
  const id = uuid();
  const senderLabel = req.user.role === "admin" ? "Decoory Team" : null;
  db.prepare("INSERT INTO messages (id, project_id, sender_user_id, sender_label, text, attachment_path) VALUES (?,?,?,?,?,?)")
    .run(id, project.id, req.user.id, senderLabel, text || null, attachmentPath || null);

  if (req.user.role === "client") {
    db.prepare("SELECT id FROM users WHERE role = 'admin'").all().forEach((a) =>
      notify(a.id, { title: `${req.user.name} sent a message`, body: text || "Shared an attachment", type: "chat", data: { projectId: project.id } })
    );
    if (attachmentPath) {
      // A reference-design upload from chat doubles as a CRM activity signal.
      createLead({
        name: req.user.name, phone: req.user.phone, scope: `Reference design shared in chat — ${project.name}`,
        source: "design-upload", status: "connected",
        searchData: { projectId: project.id, attachmentPath },
      });
    }
  } else {
    notify(project.client_user_id, { title: "New message from Decoory Team", body: text || "Sent an attachment", type: "chat", data: { projectId: project.id } });
  }
  res.status(201).json({ message: S.message(db.prepare("SELECT * FROM messages WHERE id = ?").get(id)) });
});

// Deletes a project and everything scoped to it. Does NOT delete the
// client's user account (they may get re-assigned a new project later) —
// only the project and its own data. SQLite enforces foreign keys here
// (PRAGMA foreign_keys = ON, db/index.js), so children must go first.
router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const del = db.transaction((projectId) => {
    const updateIds = db.prepare("SELECT id FROM daily_updates WHERE project_id = ?").all(projectId).map((r) => r.id);
    const delMedia = db.prepare("DELETE FROM update_media WHERE update_id = ?");
    for (const uid of updateIds) delMedia.run(uid);

    db.prepare("UPDATE leads SET converted_project_id = NULL WHERE converted_project_id = ?").run(projectId);
    db.prepare("DELETE FROM daily_updates WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM milestones WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM payments WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM project_team WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM materials WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM suggestions WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM messages WHERE project_id = ?").run(projectId);
    db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
  });
  del(project.id);

  res.status(204).end();
});

export default router;
