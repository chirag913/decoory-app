import { Router } from "express";
import { v4 as uuid } from "uuid";
import db from "../db/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as S from "../services/serialize.js";
import { normalizeParams } from "../utils/sql.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  const rows = db.prepare("SELECT * FROM team_members ORDER BY name ASC").all();
  const projectsByMember = db.prepare(`
    SELECT pt.team_member_id, p.id as project_id, p.name as project_name, p.code as project_code
    FROM project_team pt JOIN projects p ON p.id = pt.project_id
  `).all();
  res.json({
    team: rows.map((m) => ({
      ...S.teamMember(m),
      projects: projectsByMember.filter((pm) => pm.team_member_id === m.id)
        .map((pm) => ({ id: pm.project_id, name: pm.project_name, code: pm.project_code })),
    })),
  });
});

router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { name, role, phone, note, photoPath } = req.body;
  if (!name || !role) return res.status(400).json({ error: "name and role are required" });
  const id = uuid();
  db.prepare("INSERT INTO team_members (id, name, role, phone, photo_path, note) VALUES (?,?,?,?,?,?)")
    .run(id, name, role, phone || null, photoPath || null, note || null);
  res.status(201).json({ member: S.teamMember(db.prepare("SELECT * FROM team_members WHERE id = ?").get(id)) });
});

router.patch("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const row = db.prepare("SELECT * FROM team_members WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Team member not found" });
  const { name, role, phone, note, photoPath } = req.body;
  db.prepare(`
    UPDATE team_members SET
      name = COALESCE(@name, name), role = COALESCE(@role, role), phone = COALESCE(@phone, phone),
      note = COALESCE(@note, note), photo_path = COALESCE(@photoPath, photo_path)
    WHERE id = @id
  `).run(normalizeParams({ id: row.id, name, role, phone, note, photoPath }));
  res.json({ member: S.teamMember(db.prepare("SELECT * FROM team_members WHERE id = ?").get(row.id)) });
});

router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  db.prepare("DELETE FROM project_team WHERE team_member_id = ?").run(req.params.id);
  const result = db.prepare("DELETE FROM team_members WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Team member not found" });
  res.status(204).end();
});

router.post("/:id/assign", requireAuth, requireRole("admin"), (req, res) => {
  const { projectId } = req.body;
  const member = db.prepare("SELECT id FROM team_members WHERE id = ?").get(req.params.id);
  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId);
  if (!member || !project) return res.status(404).json({ error: "Team member or project not found" });
  db.prepare("INSERT OR IGNORE INTO project_team (project_id, team_member_id) VALUES (?,?)").run(projectId, member.id);
  res.status(201).json({ ok: true });
});

router.delete("/:id/assign/:projectId", requireAuth, requireRole("admin"), (req, res) => {
  db.prepare("DELETE FROM project_team WHERE team_member_id = ? AND project_id = ?").run(req.params.id, req.params.projectId);
  res.status(204).end();
});

export default router;
