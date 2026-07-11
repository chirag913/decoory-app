import { Router } from "express";
import { v4 as uuid } from "uuid";
import db from "../db/index.js";
import { requireAuth, requireRole, loadOwnProject } from "../middleware/auth.js";
import { notify } from "../services/notify.js";
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
      db.prepare(`
        INSERT INTO leads (id, name, city, phone, scope, source, status, search_data, created_at)
        VALUES (?,?,?,?,?,'design-upload','contacted',?,datetime('now'))
      `).run(uuid(), req.user.name, null, req.user.phone, `Reference design shared in chat — ${project.name}`,
        JSON.stringify({ projectId: project.id, attachmentPath }));
    }
  } else {
    notify(project.client_user_id, { title: "New message from Decoory Team", body: text || "Sent an attachment", type: "chat", data: { projectId: project.id } });
  }
  res.status(201).json({ message: S.message(db.prepare("SELECT * FROM messages WHERE id = ?").get(id)) });
});

export default router;
