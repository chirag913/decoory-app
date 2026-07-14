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

  // ── Business Snapshot (Overview dashboard) ──
  const monthlyRevenuePaise = db.prepare(`
    SELECT COALESCE(SUM(amount_paise), 0) as total FROM payments
    WHERE status = 'paid' AND strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now', '+5 hours', '+30 minutes')
  `).get().total;

  const leadCounts = db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'qualified' THEN 1 ELSE 0 END) as qualified FROM leads`).get();
  const leadConversionPct = leadCounts.total > 0 ? Math.round((leadCounts.qualified / leadCounts.total) * 100) : 0;

  const avgProjectValuePaise = db.prepare(`SELECT COALESCE(AVG(budget_paise), 0) as avg FROM projects`).get().avg;

  const projectsCompletedThisMonth = db.prepare(`
    SELECT COUNT(*) as n FROM projects
    WHERE completed_at IS NOT NULL AND strftime('%Y-%m', completed_at) = strftime('%Y-%m', 'now', '+5 hours', '+30 minutes')
  `).get().n;

  res.json({
    paymentsByMonth, leadsBySource, updateCompliance,
    businessSnapshot: {
      monthlyRevenuePaise,
      leadConversionPct,
      avgProjectValuePaise: Math.round(avgProjectValuePaise),
      projectsCompletedThisMonth,
    },
  });
});

export default router;
