import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { Avatar, Spinner } from "../shared/ui.jsx";

function AddMemberForm({ onAdded, onClose }) {
  const [form, setForm] = useState({ name: "", role: "", phone: "", note: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name || !form.role) return;
    setSaving(true);
    try {
      await api.post("/team-members", form);
      onAdded();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dk-card" style={{ padding: 16, marginBottom: 16, background: "#FBFAF6" }}>
      <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Add team member</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="dk-input" style={{ width: 180 }} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="dk-input" style={{ width: 160 }} placeholder="Role, e.g. Electrician" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <input className="dk-input" style={{ width: 160 }} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="dk-input" style={{ width: 220 }} placeholder="Note (shown to clients)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="dk-btn" disabled={saving || !form.name || !form.role} onClick={save}>{saving ? "Saving…" : "Add"}</button>
        <button className="dk-btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function MemberCard({ member, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: member.name, role: member.role, phone: member.phone || "", note: member.note || "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/team-members/${member.id}`, form);
      setEditing(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="dk-card" style={{ padding: 16 }}>
        <input className="dk-input" style={{ marginBottom: 6 }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="dk-input" style={{ marginBottom: 6 }} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <input className="dk-input" style={{ marginBottom: 6 }} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="dk-input" style={{ marginBottom: 8 }} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="dk-btn" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
          <button className="dk-btn ghost" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dk-card" style={{ padding: 16, display: "flex", gap: 12 }}>
      <Avatar name={member.name} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{member.name}</div>
          <span onClick={() => setEditing(true)} style={{ fontSize: 11.5, color: "var(--brass)", cursor: "pointer", fontWeight: 600 }}>Edit</span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--mut)" }}>{member.role}</div>
        <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 4 }}>On: {member.projects.length ? member.projects.map((p) => p.code).join(", ") : "Unassigned"}</div>
      </div>
    </div>
  );
}

export default function Workforce() {
  const [team, setTeam] = useState(null);
  const [adding, setAdding] = useState(false);

  const load = () => api.get("/team-members").then(({ team }) => setTeam(team));
  useEffect(() => { load(); }, []);

  if (!team) return <Spinner />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 600 }}>Workforce</h1>
          <div style={{ fontSize: 13, color: "var(--mut)", margin: "2px 0 0" }}>Assign people to sites — each project's roster appears in the client app for transparency.</div>
        </div>
        <button className="dk-btn" onClick={() => setAdding((v) => !v)}>Add team member</button>
      </div>

      {adding && <div style={{ marginTop: 16 }}><AddMemberForm onAdded={load} onClose={() => setAdding(false)} /></div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12, marginTop: 16 }}>
        {team.map((m) => <MemberCard key={m.id} member={m} onUpdated={load} />)}
      </div>
    </div>
  );
}
