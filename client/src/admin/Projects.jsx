import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { formatINR } from "../shared/format.js";
import { Bar, Chip, Swatches, Spinner } from "../shared/ui.jsx";

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null);

  const load = () => api.get("/projects").then(({ projects }) => setProjects(projects));
  useEffect(() => { load(); }, []);

  const remove = async (e, p) => {
    e.stopPropagation();
    if (!window.confirm(`Delete ${p.name} (${p.code})? This removes all its updates, payments, and messages permanently. The client's login stays intact. This cannot be undone.`)) return;
    await api.del(`/projects/${p.id}`);
    load();
  };

  if (!projects) return <Spinner />;

  return (
    <div>
      <h1 className="serif" style={{ fontSize: 26, fontWeight: 600, marginBottom: 16 }}>Projects</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
        {projects.map((p) => (
          <div key={p.id} className="dk-card" style={{ padding: 18, cursor: "pointer" }} onClick={() => navigate(p.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div className="dk-eyebrow">{p.code}</div>
                <div className="serif" style={{ fontSize: 19, fontWeight: 600, marginTop: 2 }}>{p.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--mut)" }}>{p.type}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Chip status={p.health} />
                <span onClick={(e) => remove(e, p)} title="Delete project" style={{ fontSize: 13, color: "var(--mut)", cursor: "pointer", padding: 2 }}>✕</span>
              </div>
            </div>
            <div style={{ margin: "14px 0 6px", display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              <span style={{ color: "var(--mut)" }}>{p.currentStage}</span><b>{p.progressPct}%</b>
            </div>
            <Bar v={p.progressPct} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, alignItems: "center" }}>
              <div style={{ fontSize: 12.5, color: "var(--mut)" }}>{formatINR(p.paidPaise)} / {formatINR(p.budgetPaise)} received</div>
              <Swatches mats={p.materials} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
