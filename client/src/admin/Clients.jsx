import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Avatar, Spinner } from "../shared/ui.jsx";

export default function Clients() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null);

  useEffect(() => {
    api.get("/projects").then(({ projects }) => setProjects(projects));
  }, []);

  if (!projects) return <Spinner />;

  return (
    <div>
      <h1 className="serif" style={{ fontSize: 26, fontWeight: 600, marginBottom: 16 }}>Clients</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 14 }}>
        {projects.map((p) => (
          <div key={p.id} className="dk-card" style={{ padding: 18 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Avatar name={p.client.name} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.client.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--mut)" }}>{p.name} · {p.code}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <button className="dk-btn ghost" onClick={() => navigate(`../projects/${p.id}`)}>Open project</button>
              <button className="dk-btn ghost" onClick={() => navigate(`${p.id}/chat`)}>Chat</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
