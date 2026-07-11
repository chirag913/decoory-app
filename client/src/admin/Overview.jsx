import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { formatINR, greeting } from "../shared/format.js";
import { Spinner } from "../shared/ui.jsx";

function Stat({ label, value, sub }) {
  return (
    <div className="dk-card" style={{ padding: "16px 18px", flex: 1, minWidth: 150 }}>
      <div className="dk-eyebrow">{label}</div>
      <div className="serif" style={{ fontSize: 30, fontWeight: 600, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

export default function Overview() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/projects"),
      api.get("/payments"),
      api.get("/leads"),
      api.get("/reports/summary"),
    ]).then(([p, pay, l, r]) => setData({ projects: p.projects, payments: pay.payments, leads: l.leads, reports: r }));
  }, []);

  if (!data) return <Spinner />;
  const { projects, payments, leads, reports } = data;

  const onTrack = projects.filter((p) => p.health === "on-track").length;
  const attention = projects.filter((p) => p.health === "attention").length;
  const duePaise = payments.filter((p) => p.status !== "paid").reduce((s, p) => s + p.amountPaise, 0);
  const overdue = payments.filter((p) => p.status === "overdue");
  const upcoming = payments.filter((p) => p.status === "upcoming");
  const newLeads = leads.filter((l) => l.status === "new");
  const today = new Date().toISOString().slice(0, 10);
  const updatesToday = reports.updateCompliance.filter((u) => u.lastUpdateDate === today).length;

  return (
    <div>
      <div className="dk-eyebrow">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div>
      <h1 className="serif" style={{ fontSize: 28, fontWeight: 600, margin: "4px 0 20px" }}>{greeting()}, Decoory team</h1>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Stat label="Active projects" value={projects.length} sub={`${onTrack} on track · ${attention} needs attention`} />
        <Stat label="Payments due" value={formatINR(duePaise)} sub={`${overdue.length} overdue · ${upcoming.length} upcoming`} />
        <Stat label="New leads" value={newLeads.length} sub={`${leads.filter((l) => l.source === "self-estimation").length} from AI self-estimation tool`} />
        <Stat label="Updates posted today" value={`${updatesToday} / ${projects.length}`} sub={updatesToday === projects.length ? "All sites reported" : "Some sites pending"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginTop: 20, alignItems: "start" }}>
        <div className="dk-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div className="dk-eyebrow">Morning brief</div>
              <div className="serif" style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>Today at your sites</div>
            </div>
            <span style={{ fontSize: 11, color: "var(--mut)" }}>Sent 8:00 AM as in-app notification</span>
          </div>
          {projects.filter((p) => p.todayPlan).map((p) => (
            <div key={p.id} style={{ borderTop: "1px solid var(--line)", marginTop: 14, paddingTop: 14, cursor: "pointer" }} onClick={() => navigate(`projects/${p.id}`)}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.name}</div>
              <div style={{ fontSize: 13, marginTop: 3 }}>{p.todayPlan}</div>
              {p.todayTeam && <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 3 }}>Team: {p.todayTeam}</div>}
            </div>
          ))}
          {projects.filter((p) => !p.todayPlan).length > 0 && (
            <div style={{ borderTop: "1px solid var(--line)", marginTop: 14, paddingTop: 14, fontSize: 12.5, color: "var(--mut)" }}>
              {projects.filter((p) => !p.todayPlan).map((p) => p.name).join(", ")} — today's plan not set yet.
            </div>
          )}
        </div>

        <div className="dk-card" style={{ padding: 20 }}>
          <div className="dk-eyebrow">Attention</div>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600, margin: "2px 0 12px" }}>Needs action</div>
          {overdue.map((p) => (
            <div key={p.id} onClick={() => navigate(`projects/${p.projectId}`)} style={{ borderLeft: "3px solid var(--bad)", padding: "8px 12px", background: "#FAF8F2", borderRadius: "0 8px 8px 0", marginBottom: 10, cursor: "pointer" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.projectName} — {formatINR(p.amountPaise)} overdue</div>
              <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>{p.label} · In-app reminder repeats daily at 10 AM</div>
            </div>
          ))}
          {newLeads.length > 0 && (
            <div onClick={() => navigate("leads")} style={{ borderLeft: "3px solid var(--ok)", padding: "8px 12px", background: "#FAF8F2", borderRadius: "0 8px 8px 0", marginBottom: 10, cursor: "pointer" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{newLeads.length} new lead{newLeads.length > 1 ? "s" : ""} today</div>
              <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>{newLeads.slice(0, 2).map((l) => l.name).join(" · ")}</div>
            </div>
          )}
          {overdue.length === 0 && newLeads.length === 0 && (
            <div style={{ fontSize: 12.5, color: "var(--mut)" }}>Nothing needs action right now.</div>
          )}
        </div>
      </div>
    </div>
  );
}
