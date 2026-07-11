import { Router } from "express";
import db from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";
import * as S from "../services/serialize.js";

const router = Router();

router.get("/", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100").all(req.user.id);
  res.json({ notifications: rows.map(S.notification) });
});

router.patch("/:id/read", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM notifications WHERE id = ?").get(req.params.id);
  if (!row || row.user_id !== req.user.id) return res.status(404).json({ error: "Notification not found" });
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(row.id);
  res.json({ notification: S.notification(db.prepare("SELECT * FROM notifications WHERE id = ?").get(row.id)) });
});

router.post("/read-all", requireAuth, (req, res) => {
  db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0").run(req.user.id);
  res.json({ ok: true });
});

export default router;
