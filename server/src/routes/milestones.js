import { Router } from "express";
import db from "../db/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { recomputeProgress } from "../services/progress.js";
import * as S from "../services/serialize.js";
import { normalizeParams } from "../utils/sql.js";

const router = Router();

router.patch("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const row = db.prepare("SELECT * FROM milestones WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Milestone not found" });
  const { title, done } = req.body;
  const nextDone = done === undefined ? row.done : (done ? 1 : 0);
  db.prepare(`
    UPDATE milestones SET
      title = COALESCE(@title, title),
      done = @done,
      completed_at = CASE WHEN @done = 1 THEN COALESCE(completed_at, strftime('%Y-%m-%dT%H:%M:%fZ','now')) ELSE NULL END
    WHERE id = @id
  `).run(normalizeParams({ id: row.id, title, done: nextDone }));
  recomputeProgress(row.project_id);
  res.json({ milestone: S.milestone(db.prepare("SELECT * FROM milestones WHERE id = ?").get(row.id)) });
});

router.delete("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const row = db.prepare("SELECT * FROM milestones WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Milestone not found" });
  db.prepare("DELETE FROM milestones WHERE id = ?").run(row.id);
  recomputeProgress(row.project_id);
  res.status(204).end();
});

export default router;
