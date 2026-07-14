import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { formatINR, formatDate } from "../shared/format.js";
import { Avatar, Chip, Spinner } from "../shared/ui.jsx";
import LeadDrawer from "./LeadDrawer.jsx";

function AddLeadForm({ onAdded, onClose }) {
  const [form, setForm] = useState({ name: "", city: "", phone: "", scope: "", budget: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await api.post("/leads", {
        name: form.name, city: form.city || null, phone: form.phone || null, scope: form.scope || null,
        statedBudgetPaise: form.budget ? Math.round(Number(form.budget) * 100) : null, source: "manual",
      });
      onAdded();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dk-card" style={{ padding: 16, marginBottom: 16, background: "#FBFAF6" }}>
      <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Add lead manually</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="dk-input" style={{ width: 180 }} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="dk-input" style={{ width: 140 }} placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input className="dk-input" style={{ width: 160 }} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="dk-input" style={{ width: 180 }} placeholder="Property type, e.g. 3BHK" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} />
        <input className="dk-input" style={{ width: 140 }} type="number" placeholder="Budget (₹)" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="dk-btn" disabled={saving || !form.name} onClick={save}>{saving ? "Saving…" : "Add lead"}</button>
        <button className="dk-btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState(null);
  const [adding, setAdding] = useState(false);
  const [openLead, setOpenLead] = useState(null);

  const load = () => api.get("/leads").then(({ leads }) => setLeads(leads));
  useEffect(() => { load(); }, []);

  const updateField = async (id, field, value) => {
    const res = await api.patch(`/leads/${id}`, { [field]: value });
    setLeads((ls) => ls.map((l) => (l.id === id ? res.lead : l)));
    setOpenLead(res.lead);
    return res;
  };

  const removeLead = async (lead) => {
    if (!window.confirm(`Delete the lead for ${lead.name}? This cannot be undone.`)) return;
    await api.del(`/leads/${lead.id}`);
    setLeads((ls) => ls.filter((l) => l.id !== lead.id));
    setOpenLead(null);
  };

  if (!leads) return <Spinner />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 600 }}>Leads</h1>
          <div style={{ fontSize: 13, color: "var(--mut)", marginTop: 2 }}>Table view of the Sales Pipeline — for the Kanban board, see Projects → Sales Pipeline.</div>
        </div>
        <button className="dk-btn" onClick={() => setAdding((v) => !v)}>Add lead manually</button>
      </div>

      {adding && <div style={{ marginTop: 16 }}><AddLeadForm onAdded={load} onClose={() => setAdding(false)} /></div>}

      <div className="dk-card" style={{ marginTop: 16, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 640 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--mut)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".06em" }}>
              {["Lead", "Scope", "Their budget", "Expected revenue", "Source", "When", "Stage"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="dk-row" style={{ borderBottom: "1px solid var(--line)", cursor: "pointer" }} onClick={() => setOpenLead(l)}>
                <td style={{ padding: "11px 16px", display: "flex", gap: 10, alignItems: "center" }}><Avatar name={l.name} /><div><b>{l.name}</b><div style={{ fontSize: 12, color: "var(--mut)" }}>{l.city || "—"}</div></div></td>
                <td style={{ padding: "11px 16px" }}>{l.scope || "—"}</td>
                <td style={{ padding: "11px 16px" }}>{formatINR(l.statedBudgetPaise)}</td>
                <td style={{ padding: "11px 16px" }}>{formatINR(l.expectedRevenuePaise)}</td>
                <td style={{ padding: "11px 16px", fontSize: 12.5, color: "var(--mut)" }}>{l.source.replace("-", " ")}</td>
                <td style={{ padding: "11px 16px", fontSize: 12.5, color: "var(--mut)" }}>{formatDate(l.createdAt)}</td>
                <td style={{ padding: "11px 16px" }}><Chip status={l.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openLead && <LeadDrawer lead={openLead} onClose={() => setOpenLead(null)} onFieldChange={updateField} onDelete={removeLead} />}
    </div>
  );
}
