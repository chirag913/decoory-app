import { Router } from "express";
import { estimateBudget } from "../services/anthropic.js";
import { notifyAllAdmins } from "../services/notify.js";
import { createLead } from "../services/leads.js";
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

  const lead = createLead({
    name: name || "Website visitor", city, phone, scope: roomType,
    statedBudgetPaise: statedBudget ? rupeesToPaise(Number(statedBudget)) : null,
    aiEstimateLowPaise: estimate.estimateLowPaise, aiEstimateHighPaise: estimate.estimateHighPaise,
    source: "self-estimation",
    searchData: { name, phone, city, roomType, sizeSqft, statedBudget, stylePreferences },
  });

  notifyAllAdmins({
    title: "New self-estimation lead",
    body: `${name || "A visitor"} — ${roomType} in ${city || "unspecified city"}`,
    type: "lead",
    data: { leadId: lead.id },
  });

  res.status(201).json({ leadId: lead.id, estimate });
});

export default router;
