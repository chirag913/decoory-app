import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { formatINR, formatDate, timeAgo } from "../shared/format.js";
import { Chip, Spinner } from "../shared/ui.jsx";
import { LEAD_STAGES } from "../shared/leadStages.js";

const SOURCES = ["manual", "facebook", "google", "referral", "website"];
const SOURCE_LABEL = { manual: "Manual", facebook: "Facebook", google: "Google", referral: "Referral", website: "Website" };

function AddLeadForm({ onAdded, onClose }) {
  const [form, setForm] = useState({ name: "", city: "", phone: "", scope: "", budget: "", source: "manual" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await api.post("/leads", {
        name: form.name, city: form.city || null, phone: form.phone || null, scope: form.scope || null,
        statedBudgetPaise: form.budget ? Math.round(Number(form.budget) * 100) : null, source: form.source,
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
        <select className="dk-select" style={{ width: 140 }} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
          {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="dk-btn" disabled={saving || !form.name} onClick={save}>{saving ? "Saving…" : "Add lead"}</button>
        <button className="dk-btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function LeadCard({ lead, dragging, onDragStart, onDragEnd, onClick }) {
  return (
    <div
      draggable
      onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onClick}
      className="dk-card"
      style={{ padding: 12, marginBottom: 10, cursor: "grab", opacity: dragging ? 0.4 : 1, userSelect: "none" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 6 }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700 }}>{lead.leadCode}</div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{lead.name}</div>
        </div>
        <Chip status={lead.priority} />
      </div>
      <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 4 }}>{lead.phone || "No phone"}</div>
      <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>{lead.scope || "—"}</div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
        <span style={{ color: "var(--mut)" }}>Budget</span><b>{formatINR(lead.statedBudgetPaise)}</b>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 12 }}>
        <span style={{ color: "var(--mut)" }}>Expected revenue</span><b>{formatINR(lead.expectedRevenuePaise)}</b>
      </div>

      <div style={{ borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 8, fontSize: 11.5, color: "var(--mut)" }}>
        <div>👤 {lead.leadOwner || "Unassigned"} · <Chip status={lead.interestLevel} /></div>
        <div style={{ marginTop: 2 }}>🕒 {lead.lastContactDate ? timeAgo(lead.lastContactDate) : "No contact yet"}</div>
        <div style={{ marginTop: 2 }}>📞 Next follow-up: {lead.followUpAt ? formatDate(lead.followUpAt) : "Not set"}</div>
      </div>
    </div>
  );
}

export default function SalesPipeline() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [boardError, setBoardError] = useState("");

  const load = () => api.get("/leads").then(({ leads }) => setLeads(leads));
  useEffect(() => { load(); }, []);

  const drop = async (stage) => {
    setDragOverStage(null);
    const lead = leads.find((l) => l.id === draggingId);
    setDraggingId(null);
    if (!lead || lead.status === stage) return;
    setBoardError("");
    const prevLeads = leads;
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status: stage } : l)));
    try {
      const res = await api.patch(`/leads/${lead.id}`, { status: stage });
      setLeads((ls) => ls.map((l) => (l.id === lead.id ? res.lead : l)));
      if (res.project) {
        setBoardError(`🎉 ${lead.name} is now project ${res.project.code} — code ${res.project.code}, PIN ${res.pin}. Share these with the client.`);
      }
    } catch (err) {
      setLeads(prevLeads);
      setBoardError(err.message || "Could not move this lead");
    }
  };

  if (!leads) return <Spinner />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 13, color: "var(--mut)" }}>Drag a card to move it through the pipeline. Reaching "Advance Received" automatically creates the project.</div>
        <button className="dk-btn" onClick={() => setAdding((v) => !v)}>+ Add lead</button>
      </div>

      {adding && <div style={{ marginTop: 16 }}><AddLeadForm onAdded={load} onClose={() => setAdding(false)} /></div>}
      {boardError && (
        <div style={{ marginTop: 16, padding: 12, background: boardError.startsWith("🎉") ? "#E4EFE8" : "#F6E0DA", color: boardError.startsWith("🎉") ? "var(--ok)" : "var(--bad)", borderRadius: 10, fontSize: 12.5, display: "flex", justifyContent: "space-between", gap: 10 }}>
          <span>{boardError}</span>
          <span style={{ cursor: "pointer" }} onClick={() => setBoardError("")}>✕</span>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 16, overflowX: "auto", paddingBottom: 12 }}>
        {LEAD_STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.status === stage.key);
          return (
            <div
              key={stage.key}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.key); }}
              onDragLeave={() => setDragOverStage((s) => (s === stage.key ? null : s))}
              onDrop={(e) => { e.preventDefault(); drop(stage.key); }}
              style={{
                flex: "0 0 260px", background: dragOverStage === stage.key ? "var(--brass-soft)" : "#FBFAF6",
                borderRadius: 12, padding: 10, minHeight: 200, border: "1px solid var(--line)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 4px 10px" }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{stage.label}</span>
                <span className="dk-chip" style={{ background: "var(--card)", color: "var(--mut)" }}>{stageLeads.length}</span>
              </div>
              {stageLeads.map((lead) => (
                <LeadCard
                  key={lead.id} lead={lead} dragging={draggingId === lead.id}
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", lead.id); e.dataTransfer.effectAllowed = "move"; setDraggingId(lead.id); }}
                  onDragEnd={() => setDraggingId(null)}
                  onClick={() => navigate(`/admin/leads/${lead.id}`)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
