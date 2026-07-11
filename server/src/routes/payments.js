import { Router } from "express";
import db from "../db/index.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { notify } from "../services/notify.js";
import * as S from "../services/serialize.js";
import { normalizeParams } from "../utils/sql.js";

const router = Router();

// GET /api/payments — admin: all pending (non-paid) payments across projects, newest-due-risk first
router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  const statusFilter = req.query.status; // optional: paid|upcoming|overdue|scheduled
  const rows = db.prepare(`
    SELECT pay.*, p.name as project_name, p.code as project_code
    FROM payments pay JOIN projects p ON p.id = pay.project_id
    ${statusFilter ? "WHERE pay.status = @status" : ""}
    ORDER BY CASE pay.status WHEN 'overdue' THEN 0 WHEN 'upcoming' THEN 1 WHEN 'scheduled' THEN 2 ELSE 3 END, pay.due_at ASC
  `).all(statusFilter ? { status: statusFilter } : {});
  res.json({
    payments: rows.map((r) => ({ ...S.payment(r), projectName: r.project_name, projectCode: r.project_code })),
  });
});

router.get("/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM payments WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Payment not found" });
  if (req.user.role === "client") {
    const project = db.prepare("SELECT client_user_id FROM projects WHERE id = ?").get(row.project_id);
    if (!project || project.client_user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  }
  res.json({ payment: S.payment(row) });
});

router.patch("/:id", requireAuth, requireRole("admin"), (req, res) => {
  const row = db.prepare("SELECT * FROM payments WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Payment not found" });
  const { label, amountPaise, dueAt, status } = req.body;
  db.prepare(`
    UPDATE payments SET
      label = COALESCE(@label, label),
      amount_paise = COALESCE(@amountPaise, amount_paise),
      due_at = COALESCE(@dueAt, due_at),
      status = COALESCE(@status, status)
    WHERE id = @id
  `).run(normalizeParams({ label, amountPaise, dueAt, status, id: row.id }));
  res.json({ payment: S.payment(db.prepare("SELECT * FROM payments WHERE id = ?").get(row.id)) });
});

// Admin manual "Record payment" — the Razorpay-absent fallback path, and also
// used by the Razorpay webhook handler (services/razorpay.js) on payment.captured.
router.post("/:id/mark-paid", requireAuth, requireRole("admin"), (req, res) => {
  markPaid(req.params.id);
  const row = db.prepare("SELECT * FROM payments WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Payment not found" });
  res.json({ payment: S.payment(row) });
});

export function markPaid(paymentId, { razorpayOrderId, razorpayPaymentId } = {}) {
  const row = db.prepare("SELECT * FROM payments WHERE id = ?").get(paymentId);
  if (!row || row.status === "paid") return;
  db.prepare(`
    UPDATE payments SET status = 'paid', paid_at = datetime('now'),
      razorpay_order_id = COALESCE(@razorpayOrderId, razorpay_order_id),
      razorpay_payment_id = COALESCE(@razorpayPaymentId, razorpay_payment_id)
    WHERE id = @id
  `).run({ id: paymentId, razorpayOrderId: razorpayOrderId || null, razorpayPaymentId: razorpayPaymentId || null });

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(row.project_id);
  notify(project.client_user_id, {
    title: "Thank you for your valuable payment",
    body: "Decoory Interior's is committed to building the home of your dreams.",
    type: "payment_thanks",
    data: { projectId: project.id, paymentId },
  });
}

export default router;
