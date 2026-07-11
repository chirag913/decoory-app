import { Router } from "express";
import { v4 as uuid } from "uuid";
import db from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Registers (or re-registers, e.g. after a re-login on the same device)
// an FCM device token for the current user. Called from the Capacitor
// Android app once push-notifications permission is granted (Phase 9).
router.post("/", requireAuth, (req, res) => {
  const { token, platform } = req.body || {};
  if (!token) return res.status(400).json({ error: "token is required" });
  db.prepare(`
    INSERT INTO push_tokens (id, user_id, token, platform) VALUES (?,?,?,?)
    ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform
  `).run(uuid(), req.user.id, token, platform || "android");
  res.status(201).json({ ok: true });
});

// Called on logout so a signed-out device stops receiving this user's pushes.
router.delete("/:token", requireAuth, (req, res) => {
  db.prepare("DELETE FROM push_tokens WHERE token = ? AND user_id = ?").run(req.params.token, req.user.id);
  res.status(204).end();
});

export default router;
