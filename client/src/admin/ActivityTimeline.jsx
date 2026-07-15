import { useState } from "react";
import { timeAgo } from "../shared/format.js";
import { ACTIVITY_TYPES, ACTIVITY_META } from "../shared/leadStages.js";

// Append-only interaction history for a lead (server/src/services/leads.js's
// logActivity) — used as the "Complete Activity Timeline" on the Lead Detail
// page. Controlled: the parent owns and fetches `activities` (it needs the
// same list for the Quotation History panel too) and handles persisting a
// new entry via `onAdd`.
export default function ActivityTimeline({ activities, onAdd }) {
  const [type, setType] = useState(ACTIVITY_TYPES[0].key);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async () => {
    setSaving(true);
    try {
      await onAdd(type, note.trim() || null);
      setNote("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <select className="dk-select" style={{ width: "auto", flexShrink: 0 }} value={type} onChange={(e) => setType(e.target.value)}>
          {ACTIVITY_TYPES.map((t) => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
        </select>
        <input className="dk-input" placeholder="Optional note…" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="dk-btn" style={{ flexShrink: 0 }} disabled={saving} onClick={add}>{saving ? "…" : "Log"}</button>
      </div>

      {activities === null && <div style={{ fontSize: 12.5, color: "var(--mut)" }}>Loading…</div>}
      {activities && activities.length === 0 && <div style={{ fontSize: 12.5, color: "var(--mut)" }}>No activity yet.</div>}
      {activities && activities.map((a) => {
        const meta = ACTIVITY_META[a.type] || ACTIVITY_META.other;
        return (
          <div key={a.id} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--brass-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{meta.icon}</span>
              <span style={{ width: 1, flex: 1, background: "var(--line)", marginTop: 2 }} />
            </div>
            <div style={{ paddingBottom: 4 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{meta.label}</div>
              {a.note && <div style={{ fontSize: 13, color: "var(--mut)", marginTop: 2 }}>{a.note}</div>}
              <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 3 }}>
                {timeAgo(a.createdAt)}{a.createdBy ? ` · ${a.createdBy}` : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
