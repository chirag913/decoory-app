import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { Avatar, SectionTitle, Spinner } from "../shared/ui.jsx";

export default function Team({ project }) {
  const [team, setTeam] = useState(null);

  useEffect(() => {
    api.get(`/projects/${project.id}/team`).then(({ team }) => setTeam(team));
  }, [project.id]);

  if (!team) return <Spinner />;

  return (
    <div>
      <SectionTitle eyebrow="Who's in your home" title="My Project Team" />
      {team.map((m) => (
        <div key={m.id} className="ca-card" style={{ padding: 14, marginBottom: 10, display: "flex", gap: 12, alignItems: "center" }}>
          <Avatar name={m.name} size={44} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{m.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--brass)", fontWeight: 600 }}>{m.role}</div>
            {m.note && <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>{m.note}</div>}
          </div>
        </div>
      ))}
      <div className="ca-card" style={{ padding: 14, background: "#FBFAF6" }}>
        <div style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6 }}>
          Every Decoory team member is verified and background-checked. Your supervisor is reachable in chat during work hours.
        </div>
      </div>
    </div>
  );
}
