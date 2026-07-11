import { Router } from "express";
import express from "express";
import db from "../db/index.js";
import { verifyWebhookSignature } from "../services/razorpay.js";
import { markPaid } from "./payments.js";

const router = Router();

// Mounted with express.raw() (not express.json()) — Razorpay signs the exact
// raw request bytes, so the body must reach here unparsed. See app.js.
router.post("/razorpay", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const rawBody = req.body.toString("utf8");

  if (!verifyWebhookSignature({ rawBody, signature })) {
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  const event = JSON.parse(rawBody);
  if (event.event === "payment.captured") {
    const orderId = event.payload?.payment?.entity?.order_id;
    const paymentId = event.payload?.payment?.entity?.id;
    const payment = db.prepare("SELECT id FROM payments WHERE razorpay_order_id = ?").get(orderId);
    if (payment) markPaid(payment.id, { razorpayOrderId: orderId, razorpayPaymentId: paymentId });
  }

  res.json({ ok: true });
});

export default router;
