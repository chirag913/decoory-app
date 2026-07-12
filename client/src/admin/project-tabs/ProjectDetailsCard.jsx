import { useState } from "react";
import { api } from "../../api/client.js";

export default function ProjectDetailsCard({ project, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [stage, setStage] = useState(project.currentStage || "");
  const [handoverDate, setHandoverDate] = useState(project.handoverDate ? project.handoverDate.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/projects/${project.id}`, { currentStage: stage, handoverDate: handoverDate || null });
      setEditing(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button className="dk-btn ghost" style={{ padding: "3px 9px", fontSize: 11.5, marginLeft: 8 }} onClick={() => setEditing(true)}>
        Edit stage / handover date
      </button>
    );
  }

  return (
    <div className="dk-card" style={{ padding: 14, marginTop: 10, background: "#FBFAF6", flexBasis: "100%", maxWidth: 340 }}>
      <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Edit stage & handover date</div>
      <input className="dk-input" value={stage} onChange={(e) => setStage(e.target.value)} placeholder="Current stage, e.g. Modular kitchen install" />
      <input className="dk-input" type="date" style={{ marginTop: 8 }} value={handoverDate} onChange={(e) => setHandoverDate(e.target.value)} />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="dk-btn ghost" onClick={() => setEditing(false)}>Cancel</button>
        <button className="dk-btn" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}
