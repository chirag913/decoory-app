import { Router } from "express";
import db from "../db/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/summary", requireAuth, requireRole("admin"), (req, res) => {
  const paymentsByMonth = db.prepare(`
    SELECT strftime('%Y-%m', paid_at) as month, SUM(amount_paise) as totalPaise, COUNT(*) as count
    FROM payments WHERE status = 'paid' AND paid_at IS NOT NULL
    GROUP BY month ORDER BY month ASC
  `).all();

  const leadsBySource = db.prepare(`
    SELECT source, COUNT(*) as count FROM leads GROUP BY source ORDER BY count DESC
  `).all();

  const updateCompliance = db.prepare(`
    SELECT p.id as projectId, p.code, p.name, MAX(du.update_date) as lastUpdateDate,
      (SELECT COUNT(*) FROM daily_updates WHERE project_id = p.id AND update_date >= date('now', '-7 days')) as updatesLast7Days
    FROM projects p LEFT JOIN daily_updates du ON du.project_id = p.id
    GROUP BY p.id ORDER BY p.code ASC
  `).all();

  res.json({ paymentsByMonth, leadsBySource, updateCompliance });
});

export default router;
