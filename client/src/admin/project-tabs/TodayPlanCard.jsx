import { useState } from "react";
import { api } from "../../api/client.js";

// "Set today's plan" — feeds the 8 AM morning-brief automation (Phase 5).
export default function TodayPlanCard({ project, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [plan, setPlan] = useState(project.todayPlan || "");
  const [team, setTeam] = useState(project.todayTeam || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/projects/${project.id}`, { todayPlan: plan, todayTeam: team });
      setEditing(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="dk-card" style={{ padding: 16, background: "#FBFAF6", display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
        <div>
          <div className="dk-eyebrow">Today's plan · used by the 8 AM automation</div>
          {project.todayPlan ? (
            <>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>{project.todayPlan}</div>
              {project.todayTeam && <div style={{ fontSize: 12.5, color: "var(--mut)", marginTop: 3 }}>Team: {project.todayTeam}</div>}
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--mut)", marginTop: 4 }}>Not set yet — the morning brief will skip this project.</div>
          )}
        </div>
        <button className="dk-btn ghost" onClick={() => setEditing(true)}>Edit</button>
      </div>
    );
  }

  return (
    <div className="dk-card" style={{ padding: 16, background: "#FBFAF6" }}>
      <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Set today's plan</div>
      <textarea className="dk-textarea" value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="What's happening on site today + expected completion note…" />
      <input className="dk-input" style={{ marginTop: 8 }} value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Team on site, e.g. Sunil (carpentry) · Arif (electrical)" />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="dk-btn ghost" onClick={() => setEditing(false)}>Cancel</button>
        <button className="dk-btn" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save plan"}</button>
      </div>
    </div>
  );
}
