import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { formatINR, formatDate } from "../shared/format.js";
import { Chip, SectionTitle, Spinner } from "../shared/ui.jsx";
import { whatsappPaymentLink } from "../shared/contact.js";

// Maps our four-state payment status onto the prototype's simpler paid/due/scheduled chip.
function chipStatus(status) {
  if (status === "paid") return "paid";
  if (status === "scheduled") return "scheduled";
  return "due"; // upcoming | overdue
}

export default function Payments({ project }) {
  const [payments, setPayments] = useState(null);

  useEffect(() => {
    api.get(`/projects/${project.id}/payments`).then(({ payments }) => setPayments(payments));
  }, [project.id]);

  if (!payments) return <Spinner />;

  const paidTotal = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountPaise, 0);

  return (
    <div>
      <SectionTitle eyebrow="Transparent billing" title="Payment schedule" />
      <div className="ca-card" style={{ padding: "12px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ color: "var(--mut)" }}>Received so far</span>
        <b>{formatINR(paidTotal)} of {formatINR(project.budgetPaise)}</b>
      </div>

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

          {p.status !== "paid" && p.status !== "scheduled" && (
            <a
              className="ca-btn" style={{ marginTop: 10, display: "block", textAlign: "center", textDecoration: "none", background: "#25D366" }}
              href={whatsappPaymentLink({ projectName: project.name, projectCode: project.code, label: p.label, amountText: formatINR(p.amountPaise) })}
              target="_blank" rel="noreferrer"
            >
              💬 Message us on WhatsApp for a payment link
            </a>
          )}
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: "var(--mut)", textAlign: "center", padding: "2px 0 14px" }}>
        Gentle reminders arrive 6–10 hrs before due time, only between 8 AM – 8 PM.
      </div>
    </div>
  );
}
