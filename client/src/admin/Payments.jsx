import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { formatINR, formatDate } from "../shared/format.js";
import { Chip, Spinner } from "../shared/ui.jsx";

export default function Payments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = () => api.get("/payments").then(({ payments }) => {
    const order = { overdue: 0, upcoming: 1, scheduled: 2, paid: 3 };
    setPayments([...payments].sort((a, b) => order[a.status] - order[b.status]));
  });
  useEffect(() => { load(); }, []);

  const markPaid = async (id, e) => {
    e.stopPropagation();
    setBusyId(id);
    try {
      await api.post(`/payments/${id}/mark-paid`, {});
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (!payments) return <Spinner />;
  const pending = payments.filter((p) => p.status !== "paid");

  return (
    <div>
      <h1 className="serif" style={{ fontSize: 26, fontWeight: 600 }}>Payments</h1>
      <div style={{ fontSize: 13, color: "var(--mut)", margin: "2px 0 16px" }}>
        All pending milestones across projects. Reminders are in-app + push only (8 AM – 8 PM window, 6–10 hrs before due).
      </div>
      <div className="dk-card" style={{ maxWidth: 780, overflow: "hidden" }}>
        {pending.map((r, i) => (
          <div key={r.id} className="dk-row" onClick={() => navigate(`../projects/${r.projectId}`)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 18px", borderTop: i ? "1px solid var(--line)" : "none", cursor: "pointer", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.projectName} — {r.label}</div>
              <div style={{ fontSize: 12, color: "var(--mut)" }}>Due {formatDate(r.dueAt)}</div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <b>{formatINR(r.amountPaise)}</b>
              <Chip status={r.status} />
              <button className="dk-btn ghost" disabled={busyId === r.id} onClick={(e) => markPaid(r.id, e)}>
                {busyId === r.id ? "Marking…" : "Mark as paid"}
              </button>
            </div>
          </div>
        ))}
        {pending.length === 0 && <div style={{ padding: 18, fontSize: 13, color: "var(--mut)" }}>All caught up — nothing pending.</div>}
      </div>
    </div>
  );
}
