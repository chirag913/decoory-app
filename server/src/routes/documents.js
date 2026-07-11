import { Router } from "express";
import db from "../db/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as S from "../services/serialize.js";
import { normalizeParams } from "../utils/sql.js";

const router = Router();

router.get("/", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM documents ORDER BY section_key ASC").all();
  res.json({ documents: rows.map(S.document) });
});

router.patch("/:key", requireAuth, requireRole("admin"), (req, res) => {
  const row = db.prepare("SELECT * FROM documents WHERE section_key = ?").get(req.params.key);
  if (!row) return res.status(404).json({ error: "Document not found" });
  const { title, body } = req.body;
  const bodyStr = row.section_key === "usp" && Array.isArray(body) ? JSON.stringify(body) : body;
  db.prepare("UPDATE documents SET title = COALESCE(@title, title), body = COALESCE(@body, body), updated_at = datetime('now') WHERE section_key = @key")
    .run(normalizeParams({ title, body: bodyStr, key: row.section_key }));
  res.json({ document: S.document(db.prepare("SELECT * FROM documents WHERE section_key = ?").get(row.section_key)) });
});

export default router;
