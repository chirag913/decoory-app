import { Router } from "express";
import db from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";
import { notifyAllAdmins } from "../services/notify.js";
import * as S from "../services/serialize.js";

const router = Router();

// Client taps "I'm interested" / "Maybe later" on a suggestion card.
router.patch("/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM suggestions WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Suggestion not found" });
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(row.project_id);
  if (req.user.role === "client" && project.client_user_id !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const { status } = req.body;
  if (!["sent", "interested", "dismissed"].includes(status)) {
    return res.status(400).json({ error: "status must be sent, interested, or dismissed" });
  }
  db.prepare("UPDATE suggestions SET status = ? WHERE id = ?").run(status, row.id);
  if (status === "interested") {
    notifyAllAdmins({
      title: `${project.name} client is interested`,
      body: row.title,
      type: "suggestion",
      data: { projectId: project.id, suggestionId: row.id },
    });
  }
  res.json({ suggestion: S.suggestion(db.prepare("SELECT * FROM suggestions WHERE id = ?").get(row.id)) });
});

export default router;
