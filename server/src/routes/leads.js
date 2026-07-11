import { Router } from "express";
import { v4 as uuid } from "uuid";
import db from "../db/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as S from "../services/serialize.js";
import { normalizeParams } from "../utils/sql.js";

const router = Router();

router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  const rows = db.prepare("SELECT * FROM leads ORDER BY created_at DESC").all();
  res.json({ leads: rows.map(S.lead) });
});

router.post("/", requireAuth, requireRole("admin"), (req, res) => {
  const { name, city, phone, scope, statedBudgetPaise, aiEstimateLowPaise, aiEstimateHighPaise, source, searchData } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  const id = uuid();
  db.prepare(`
    INSERT INTO leads (id, name, city, phone, scope, stated_budget_paise, ai_estimate_low_paise, ai_estimate_high_paise, source, status, search_data)
    VALUES (@id,@name,@city,@phone,@scope,@statedBudgetPaise,@aiEstimateLowPaise,@aiEstimateHighPaise,@source,'new',@searchData)
  `).run({
    id, name, city: city || null, phone: phone || null, scope: scope || null,
    statedBudgetPaise: statedBudgetPaise || null, aiEstimateLowPaise: aiEstimateLowPaise || null, aiEstimateHighPaise: aiEstimateHighPaise || null,
    source: source || "manual", searchData: searchData ? JSON.stringify(searchData) : null,
  });
  res.status(201).json({ lead: S.lead(db.prepare("SELECT * FROM leads WHERE id = ?").get(id)) });
});

router.patch("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const row = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Lead not found" });
  const { status, name, city, phone, scope } = req.body;
  db.prepare(`
    UPDATE leads SET
      status = COALESCE(@status, status), name = COALESCE(@name, name),
      city = COALESCE(@city, city), phone = COALESCE(@phone, phone), scope = COALESCE(@scope, scope)
    WHERE id = @id
  `).run(normalizeParams({ id: row.id, status, name, city, phone, scope }));
  res.json({ lead: S.lead(db.prepare("SELECT * FROM leads WHERE id = ?").get(row.id)) });
});

export default router;
