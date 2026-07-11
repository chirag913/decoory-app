import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { formatINR, formatDate } from "../shared/format.js";
import { Bar, Chip, Spinner } from "../shared/ui.jsx";
import UpdatesTab from "./project-tabs/UpdatesTab.jsx";
import PaymentsTab from "./project-tabs/PaymentsTab.jsx";
import TeamTab from "./project-tabs/TeamTab.jsx";
import TodayPlanCard from "./project-tabs/TodayPlanCard.jsx";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState("updates");

  const reload = () => api.get(`/projects/${id}`).then(({ project }) => setProject(project));
  useEffect(() => { reload(); }, [id]);

  if (!project) return <Spinner />;

  return (
    <div>
      <button className="dk-btn ghost" onClick={() => navigate("..")} style={{ marginBottom: 14 }}>← All projects</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div className="dk-eyebrow">{project.code} · Client: {project.client.name}</div>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 600, margin: "2px 0" }}>{project.name}</h1>
          <div style={{ fontSize: 13, color: "var(--mut)" }}>{project.type} · Handover target {formatDate(project.handoverDate)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <Chip status={project.health} />
          <div style={{ fontSize: 12.5, color: "var(--mut)", marginTop: 8 }}>{formatINR(project.paidPaise)} received of {formatINR(project.budgetPaise)}</div>
        </div>
      </div>
      <div style={{ margin: "16px 0 4px", maxWidth: 520 }}><Bar v={project.progressPct} /></div>
      <div style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 14 }}>{project.progressPct}% complete — {project.currentStage}</div>

      <TodayPlanCard project={project} onSaved={reload} />

      <div style={{ borderBottom: "1px solid var(--line)", margin: "18px 0" }}>
        {[["updates", "Daily updates"], ["payments", "Payments"], ["team", "My Project Team"]].map(([k, l]) => (
          <button key={k} className={`dk-tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "updates" && <UpdatesTab project={project} />}
      {tab === "payments" && <PaymentsTab project={project} onChange={reload} />}
      {tab === "team" && <TeamTab project={project} onChange={reload} />}
    </div>
  );
}
