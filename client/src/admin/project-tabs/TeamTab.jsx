import { useEffect, useState } from "react";
import { api } from "../../api/client.js";
import { Avatar, Spinner } from "../../shared/ui.jsx";

export default function TeamTab({ project, onChange }) {
  const [team, setTeam] = useState(null);
  const [allMembers, setAllMembers] = useState(null);
  const [selected, setSelected] = useState("");

  const load = () => api.get(`/projects/${project.id}/team`).then(({ team }) => setTeam(team));
  useEffect(() => { load(); }, [project.id]);
  useEffect(() => { api.get("/team-members").then(({ team }) => setAllMembers(team)); }, []);

  const assign = async () => {
    if (!selected) return;
    await api.post(`/team-members/${selected}/assign`, { projectId: project.id });
    setSelected("");
    load();
    onChange?.();
  };

  const unassign = async (memberId) => {
    await api.del(`/team-members/${memberId}/assign/${project.id}`);
    load();
    onChange?.();
  };

  if (!team || !allMembers) return <Spinner />;
  const available = allMembers.filter((m) => !team.some((t) => t.id === m.id));

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12, marginBottom: 16 }}>
        {team.map((m) => (
          <div key={m.id} className="dk-card" style={{ padding: 16, display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Avatar name={m.name} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--mut)" }}>{m.role} · {m.phone}</div>
              </div>
            </div>
            <button className="dk-btn ghost" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => unassign(m.id)}>Remove</button>
          </div>
        ))}
        {team.length === 0 && <div style={{ fontSize: 13, color: "var(--mut)" }}>No one assigned yet.</div>}
      </div>

      {available.length > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <select className="dk-select" style={{ width: 240 }} value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Assign a team member…</option>
            {available.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}
          </select>
          <button className="dk-btn" disabled={!selected} onClick={assign}>Assign</button>
        </div>
      )}

      <div style={{ fontSize: 12, color: "var(--mut)" }}>
        This roster is visible to the client in their app as "My Project Team" — photo, name and role of everyone working in their home.
      </div>
    </div>
  );
}
