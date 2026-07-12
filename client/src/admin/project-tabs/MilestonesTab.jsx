import { useEffect, useState } from "react";
import { api } from "../../api/client.js";
import { Spinner } from "../../shared/ui.jsx";

export default function MilestonesTab({ project, onChange }) {
  const [milestones, setMilestones] = useState(null);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const load = () => api.get(`/projects/${project.id}/milestones`).then(({ milestones }) => setMilestones(milestones));
  useEffect(() => { load(); }, [project.id]);

  const refresh = async () => {
    await load();
    onChange?.();
  };

  const add = async () => {
    if (!title.trim()) return;
    setAdding(true);
    try {
      await api.post(`/projects/${project.id}/milestones`, { title: title.trim() });
      setTitle("");
      await refresh();
    } finally {
      setAdding(false);
    }
  };

  const toggle = async (m) => {
    await api.patch(`/milestones/${m.id}`, { done: !m.done });
    await refresh();
  };

  const remove = async (m) => {
    await api.del(`/milestones/${m.id}`);
    await refresh();
  };

  if (!milestones) return <Spinner />;

  const doneCount = milestones.filter((m) => m.done).length;
  const pct = milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0;

  return (
    <div style={{ maxWidth: 560 }}>
      {milestones.length > 0 && (
        <div className="dk-card" style={{ padding: "12px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: "var(--mut)" }}>{doneCount} of {milestones.length} milestones complete</span>
          <b>{pct}% — feeds the progress bar above</b>
        </div>
      )}

      {milestones.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--mut)", marginBottom: 14 }}>
          No milestones yet — add the steps this project needs before handover (e.g. "Design finalized", "Material procurement", "Painting & finishing"). The progress bar switches to tracking these once you add the first one.
        </div>
      )}

      {milestones.map((m) => (
        <div key={m.id} className="dk-card" style={{ padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" checked={m.done} onChange={() => toggle(m)} style={{ width: 17, height: 17, cursor: "pointer" }} />
          <span style={{ flex: 1, fontSize: 13.5, textDecoration: m.done ? "line-through" : "none", color: m.done ? "var(--mut)" : "var(--ink)" }}>{m.title}</span>
          <button className="dk-btn ghost" style={{ padding: "3px 9px", fontSize: 12 }} onClick={() => remove(m)}>✕</button>
        </div>
      ))}

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          className="dk-input" value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a milestone, e.g. Electrical & plumbing rough-in"
        />
        <button className="dk-btn" disabled={adding || !title.trim()} onClick={add} style={{ whiteSpace: "nowrap" }}>
          {adding ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}
