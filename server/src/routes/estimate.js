import { Router } from "express";
import { v4 as uuid } from "uuid";
import db from "../db/index.js";
import { estimateBudget } from "../services/anthropic.js";
import { notifyAllAdmins } from "../services/notify.js";
import { rupeesToPaise } from "../utils/money.js";

const router = Router();

// Public, no-login self-estimation tool. Every submission is saved as a
// lead with search_data = everything the visitor entered, per spec.
router.post("/", async (req, res) => {
  const { name, phone, city, roomType, sizeSqft, statedBudget, stylePreferences } = req.body || {};
  if (!roomType) return res.status(400).json({ error: "roomType is required" });

  const estimate = await estimateBudget({
    city, roomType, sizeSqft: Number(sizeSqft) || null, statedBudget: Number(statedBudget) || null, stylePreferences,
  });

  const id = uuid();
  db.prepare(`
    INSERT INTO leads (id, name, city, phone, scope, stated_budget_paise, ai_estimate_low_paise, ai_estimate_high_paise, source, status, search_data)
    VALUES (@id,@name,@city,@phone,@scope,@statedBudgetPaise,@estimateLowPaise,@estimateHighPaise,'self-estimation','new',@searchData)
  `).run({
    id, name: name || "Website visitor", city: city || null, phone: phone || null, scope: roomType,
    statedBudgetPaise: statedBudget ? rupeesToPaise(Number(statedBudget)) : null,
    estimateLowPaise: estimate.estimateLowPaise, estimateHighPaise: estimate.estimateHighPaise,
    searchData: JSON.stringify({ name, phone, city, roomType, sizeSqft, statedBudget, stylePreferences }),
  });

  notifyAllAdmins({
    title: "New self-estimation lead",
    body: `${name || "A visitor"} — ${roomType} in ${city || "unspecified city"}`,
    type: "lead",
    data: { leadId: id },
  });

  res.status(201).json({ leadId: id, estimate });
});

export default router;
