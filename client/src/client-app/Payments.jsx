import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { formatINR, formatDate } from "../shared/format.js";
import { Chip, SectionTitle, Spinner } from "../shared/ui.jsx";

// Maps our four-state payment status onto the prototype's simpler paid/due/scheduled chip.
function chipStatus(status) {
  if (status === "paid") return "paid";
  if (status === "scheduled") return "scheduled";
  return "due"; // upcoming | overdue
}

export default function Payments({ project }) {
  const [payments, setPayments] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [justPaidId, setJustPaidId] = useState(null);
  const [error, setError] = useState("");

  const load = () => api.get(`/projects/${project.id}/payments`).then(({ payments }) => setPayments(payments));
  useEffect(() => { load(); }, [project.id]);

  const pay = async (payment) => {
    setError("");
    setPayingId(payment.id);
    try {
      // Razorpay checkout wires in here (see server/src/routes/payments.js
      // and services/razorpay.js) — falls back to a friendly message when
      // RAZORPAY_KEY_ID isn't configured yet.
      const res = await api.post(`/payments/${payment.id}/checkout`, {});
      if (res?.razorpayOrder) {
        // Real Razorpay Checkout.js flow — see PaymentCheckout helper.
        await window.__decooryOpenRazorpay?.(res, payment, () => { setJustPaidId(payment.id); load(); });
      }
    } catch (err) {
      setError(err.message || "Payment could not be started. Please try again or contact your supervisor.");
    } finally {
      setPayingId(null);
    }
  };

  if (!payments) return <Spinner />;

  const paidTotal = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountPaise, 0);

  return (
    <div>
      <SectionTitle eyebrow="Transparent billing" title="Payment schedule" />
      <div className="ca-card" style={{ padding: "12px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ color: "var(--mut)" }}>Received so far</span>
        <b>{formatINR(paidTotal)} of {formatINR(project.budgetPaise)}</b>
      </div>

      {error && <div style={{ marginBottom: 12, fontSize: 12.5, color: "var(--bad)" }}>{error}</div>}

      {payments.map((p) => (
        <div key={p.id} className="ca-card" style={{ padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.label}</div>
              <div style={{ fontSize: 12, color: "var(--mut)" }}>
                {formatINR(p.amountPaise)} · {p.status === "paid" ? `Paid ${formatDate(p.paidAt)}` : `Due ${formatDate(p.dueAt)}`}
              </div>
            </div>
            <Chip status={chipStatus(p.status)} size="ca" />
          </div>

          {p.status !== "paid" && p.status !== "scheduled" && justPaidId !== p.id && (
            <button className="ca-btn" style={{ marginTop: 10 }} disabled={payingId === p.id} onClick={() => pay(p)}>
              {payingId === p.id ? "Opening secure checkout…" : `Pay ${formatINR(p.amountPaise)} securely`}
            </button>
          )}
          {justPaidId === p.id && (
            <div style={{ marginTop: 10, background: "#E4EFE8", borderRadius: 10, padding: 12, fontSize: 12.5, color: "#2E5C45", lineHeight: 1.5 }}>
              ✓ Payment received — receipt sent to your email.<br />
              <b>Thank you for your valuable payment.</b> Decoory Interior's is committed to building the home of your dreams. 🏡
            </div>
          )}
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: "var(--mut)", textAlign: "center", padding: "2px 0 14px" }}>
        Gentle reminders arrive 6–10 hrs before due time, only between 8 AM – 8 PM.
      </div>
    </div>
  );
}
