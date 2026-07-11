import { useEffect, useState } from "react";
import { api } from "../../api/client.js";
import { formatINR, formatDate } from "../../shared/format.js";
import { Chip, Spinner } from "../../shared/ui.jsx";

export default function PaymentsTab({ project, onChange }) {
  const [payments, setPayments] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "", amount: "", dueAt: "" });

  const load = () => api.get(`/projects/${project.id}/payments`).then(({ payments }) => setPayments(payments));
  useEffect(() => { load(); }, [project.id]);

  const markPaid = async (id) => {
    setBusyId(id);
    try {
      await api.post(`/payments/${id}/mark-paid`, {});
      await load();
      onChange?.();
    } finally {
      setBusyId(null);
    }
  };

  const addPayment = async () => {
    if (!form.label || !form.amount || !form.dueAt) return;
    await api.post(`/projects/${project.id}/payments`, {
      label: form.label, amountPaise: Math.round(Number(form.amount) * 100), dueAt: new Date(form.dueAt).toISOString(), status: "scheduled",
    });
    setForm({ label: "", amount: "", dueAt: "" });
    setAdding(false);
    load();
  };

  if (!payments) return <Spinner />;

  return (
    <div className="dk-card" style={{ maxWidth: 700, overflow: "hidden" }}>
      {payments.map((pay, i) => (
        <div key={pay.id} className="dk-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 18px", borderTop: i ? "1px solid var(--line)" : "none", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{pay.label}</div>
            <div style={{ fontSize: 12, color: "var(--mut)" }}>
              {pay.status === "paid" ? `Paid ${formatDate(pay.paidAt)}` : `Due ${formatDate(pay.dueAt)}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <b style={{ fontSize: 14 }}>{formatINR(pay.amountPaise)}</b>
            <Chip status={pay.status} />
            {pay.status !== "paid" && (
              <button className="dk-btn ghost" disabled={busyId === pay.id} onClick={() => markPaid(pay.id)}>
                {busyId === pay.id ? "Marking…" : "Mark as paid"}
              </button>
            )}
          </div>
        </div>
      ))}

      <div style={{ padding: "13px 18px", borderTop: "1px solid var(--line)" }}>
        {!adding ? (
          <button className="dk-btn ghost" onClick={() => setAdding(true)}>+ Add payment milestone</button>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input className="dk-input" style={{ width: 200 }} placeholder="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <input className="dk-input" style={{ width: 120 }} type="number" placeholder="Amount (₹)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <input className="dk-input" style={{ width: 160 }} type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
            <button className="dk-btn" onClick={addPayment}>Add</button>
            <button className="dk-btn ghost" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        )}
      </div>

      <div style={{ padding: "11px 18px", background: "#FBFAF6", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--mut)" }}>
        Reminders fire only between 8:00 AM – 8:00 PM, 6–10 hours before due time. On payment received, client gets an automatic thank-you note.
      </div>
    </div>
  );
}
