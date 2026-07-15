import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { formatINR } from "../shared/format.js";
import { Bar, Chip, Swatches, Spinner } from "../shared/ui.jsx";

const EMPTY_FORM = {
  clientName: "", clientEmail: "", clientPhone: "", clientPassword: "",
  name: "", type: "", budget: "", startDate: "", handoverDate: "", code: "", pin: "",
};

function AddProjectForm({ onCreated, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!form.clientName || !form.name || !form.type || !form.budget || (!form.clientEmail && !form.clientPhone)) {
      setError("Client name, project name, type, budget, and an email or phone are required.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const { project, clientPassword, pin } = await api.post("/projects", {
        name: form.name, type: form.type, budgetPaise: Math.round(Number(form.budget) * 100),
        startDate: form.startDate || null, handoverDate: form.handoverDate || null,
        code: form.code || undefined, pin: form.pin || undefined,
        client: { name: form.clientName, email: form.clientEmail || null, phone: form.clientPhone || null, password: form.clientPassword || undefined },
      });
      setResult({ project, clientPassword, pin });
    } catch (err) {
      setError(err.message || "Could not create project");
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <div className="dk-card" style={{ padding: 16, marginBottom: 16, background: "#E4EFE8" }}>
        <div className="dk-eyebrow" style={{ color: "var(--ok)" }}>Project created</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{result.project.name} — {result.project.code}</div>
        <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.8 }}>
          Share these with the client so they can log in:<br />
          <b>Project code:</b> {result.project.code} &nbsp; <b>PIN:</b> {result.pin}<br />
          {result.clientPassword && <><b>Password</b> (if they'd rather use email/phone login): <code>{result.clientPassword}</code></>}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="dk-btn" onClick={() => { onCreated(); onClose(); }}>Done</button>
          <button className="dk-btn ghost" onClick={() => { setResult(null); setForm(EMPTY_FORM); onCreated(); }}>Add another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dk-card" style={{ padding: 16, marginBottom: 16, background: "#FBFAF6" }}>
      <div className="dk-eyebrow" style={{ marginBottom: 8 }}>New client & project</div>
      <div style={{ fontSize: 12, color: "var(--mut)", marginBottom: 10 }}>For a project with no prior lead record (e.g. a direct referral). Most projects should come from the Sales Pipeline reaching "Advance Received" instead.</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <input className="dk-input" style={{ width: 180 }} placeholder="Client name *" value={form.clientName} onChange={set("clientName")} />
        <input className="dk-input" style={{ width: 200 }} placeholder="Client email" value={form.clientEmail} onChange={set("clientEmail")} />
        <input className="dk-input" style={{ width: 160 }} placeholder="Client phone" value={form.clientPhone} onChange={set("clientPhone")} />
        <input className="dk-input" style={{ width: 160 }} placeholder="Password (optional)" value={form.clientPassword} onChange={set("clientPassword")} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <input className="dk-input" style={{ width: 200 }} placeholder="Project name, e.g. Mehta Residence *" value={form.name} onChange={set("name")} />
        <input className="dk-input" style={{ width: 220 }} placeholder="Type, e.g. 3BHK · Sector 50, Noida *" value={form.type} onChange={set("type")} />
        <input className="dk-input" style={{ width: 140 }} type="number" placeholder="Budget (₹) *" value={form.budget} onChange={set("budget")} />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <label style={{ fontSize: 11.5, color: "var(--mut)" }}>Start<input className="dk-input" style={{ width: 150, marginTop: 2 }} type="date" value={form.startDate} onChange={set("startDate")} /></label>
        <label style={{ fontSize: 11.5, color: "var(--mut)" }}>Handover target<input className="dk-input" style={{ width: 150, marginTop: 2 }} type="date" value={form.handoverDate} onChange={set("handoverDate")} /></label>
        <label style={{ fontSize: 11.5, color: "var(--mut)" }}>Project code (auto if blank)<input className="dk-input" style={{ width: 130, marginTop: 2 }} placeholder="DCR-104" value={form.code} onChange={set("code")} /></label>
        <label style={{ fontSize: 11.5, color: "var(--mut)" }}>PIN (auto if blank)<input className="dk-input" style={{ width: 100, marginTop: 2 }} placeholder="1104" value={form.pin} onChange={set("pin")} /></label>
      </div>
      {error && <div style={{ fontSize: 12.5, color: "var(--bad)", marginBottom: 8 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="dk-btn" disabled={saving} onClick={save}>{saving ? "Creating…" : "Create project"}</button>
        <button className="dk-btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

export default function ProjectsGrid() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null);
  const [adding, setAdding] = useState(false);

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 600 }}>Projects</h1>
          <div style={{ fontSize: 13, color: "var(--mut)", marginTop: 2 }}>Customers who've paid an advance — active, in-progress work.</div>
        </div>
        <button className="dk-btn" onClick={() => setAdding((v) => !v)}>+ New project</button>
      </div>

      {adding && <AddProjectForm onCreated={load} onClose={() => setAdding(false)} />}

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
              <span style={{ color: "var(--mut)" }}>{p.currentStage || "Not started"}</span><b>{p.progressPct}%</b>
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
