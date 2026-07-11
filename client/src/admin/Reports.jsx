import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { formatINR, formatDate } from "../shared/format.js";
import { Spinner } from "../shared/ui.jsx";

function BarRow({ label, value, max, formatted }) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
        <span style={{ color: "var(--mut)" }}>{label}</span><b>{formatted}</b>
      </div>
      <div style={{ background: "#ECE9DF", borderRadius: 99, height: 10, width: "100%" }}>
        <div style={{ width: `${pct}%`, height: 10, borderRadius: 99, background: "var(--brass)" }} />
      </div>
    </div>
  );
}

export default function Reports() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/reports/summary").then(setData);
  }, []);

  if (!data) return <Spinner />;
  const { paymentsByMonth, leadsBySource, updateCompliance } = data;

  const maxPayment = Math.max(0, ...paymentsByMonth.map((m) => m.totalPaise));
  const maxLeads = Math.max(0, ...leadsBySource.map((l) => l.count));

  return (
    <div>
      <h1 className="serif" style={{ fontSize: 26, fontWeight: 600, marginBottom: 16 }}>Reports</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="dk-card" style={{ padding: 20 }}>
          <div className="dk-eyebrow">Collections</div>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600, margin: "2px 0 14px" }}>Payments collected per month</div>
          {paymentsByMonth.length === 0 && <div style={{ fontSize: 13, color: "var(--mut)" }}>No payments collected yet.</div>}
          {paymentsByMonth.map((m) => (
            <BarRow key={m.month} label={m.month} value={m.totalPaise} max={maxPayment} formatted={`${formatINR(m.totalPaise)} · ${m.count} payment${m.count > 1 ? "s" : ""}`} />
          ))}
        </div>

        <div className="dk-card" style={{ padding: 20 }}>
          <div className="dk-eyebrow">CRM</div>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600, margin: "2px 0 14px" }}>Lead sources</div>
          {leadsBySource.map((l) => (
            <BarRow key={l.source} label={l.source.replace("-", " ")} value={l.count} max={maxLeads} formatted={l.count} />
          ))}
        </div>

        <div className="dk-card" style={{ padding: 20, gridColumn: "1 / -1" }}>
          <div className="dk-eyebrow">Field reporting</div>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600, margin: "2px 0 14px" }}>Update compliance per project</div>
          {updateCompliance.map((p) => (
            <div key={p.projectId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderTop: "1px solid var(--line)" }}>
              <div>
                <b style={{ fontSize: 13.5 }}>{p.code}</b>
                <span style={{ fontSize: 12.5, color: "var(--mut)", marginLeft: 8 }}>{p.name}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--mut)" }}>
                {p.updatesLast7Days} update{p.updatesLast7Days === 1 ? "" : "s"} in 7 days · last {p.lastUpdateDate ? formatDate(p.lastUpdateDate) : "never"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
