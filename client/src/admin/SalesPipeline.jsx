import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatINR, formatDate } from "../shared/format.js";
import { Spinner } from "../shared/ui.jsx";
import { LEAD_STAGES } from "../shared/leadStages.js";
import { whatsappLeadLink } from "../shared/contact.js";
import {
  PRIORITY_CARDS, QUICK_FILTERS, leadMatchesFilters, leadAge, nextAction, overdueBadge,
  computeFunnel, LOST_REASONS, buildSalesQueue,
} from "../shared/pipelineHelpers.js";

const SOURCES = ["manual", "facebook", "google", "referral", "website"];
const SOURCE_LABEL = {
  manual: "Manual", facebook: "Facebook", google: "Google", referral: "Referral", website: "Website",
  "self-estimation": "Self-estimation", "design-upload": "Design upload",
};

const ICON_BTN = { flex: 1, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 6, padding: "5px 0", fontSize: 13, cursor: "pointer" };

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

function PriorityCards({ leads, activeFilters, toggleFilter }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 18 }}>
      {PRIORITY_CARDS.map((c) => {
        const count = leads.filter((l) => c.match(l)).length;
        const active = activeFilters.has(c.key);
        return (
          <div
            key={c.key} className="dk-card" onClick={() => toggleFilter(c.key)}
            style={{
              padding: "12px 14px", cursor: "pointer",
              border: active ? "1.5px solid var(--brass)" : "1px solid var(--line)",
              background: active ? "var(--brass-soft)" : "var(--card)",
            }}
          >
            <div style={{ fontSize: 18 }}>{c.icon}</div>
            <div className="serif" style={{ fontSize: 24, fontWeight: 600, marginTop: 2 }}>{count}</div>
            <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 2, lineHeight: 1.3 }}>{c.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function Funnel({ leads }) {
  const steps = computeFunnel(leads);
  const max = Math.max(1, ...steps.map((s) => s.count));
  return (
    <div className="dk-card" style={{ padding: 16, marginTop: 12 }}>
      <div className="dk-eyebrow" style={{ marginBottom: 10 }}>Sales Funnel · live pipeline depth</div>
      <div style={{ display: "flex", alignItems: "end", gap: 2, overflowX: "auto" }}>
        {steps.map((s, i) => (
          <div key={s.stage} style={{ display: "flex", alignItems: "center", flex: "0 0 auto" }}>
            <div style={{ textAlign: "center", minWidth: 92 }}>
              <div className="serif" style={{ fontSize: 21, fontWeight: 600 }}>{s.count}</div>
              <div style={{ fontSize: 10.5, color: "var(--mut)", marginTop: 2 }}>{s.label}</div>
              <div style={{ height: 5, borderRadius: 99, background: "#ECE9DF", marginTop: 6 }}>
                <div style={{ width: `${(s.count / max) * 100}%`, height: 5, borderRadius: 99, background: "var(--brass)" }} />
              </div>
            </div>
            {i < steps.length - 1 && <span style={{ color: "var(--line)", fontSize: 15, margin: "0 2px 18px" }}>→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickFilters({ activeFilters, toggleFilter }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14, alignItems: "center" }}>
      {QUICK_FILTERS.map((f) => {
        const active = activeFilters.has(f.key);
        return (
          <span
            key={f.key} className="dk-chip" onClick={() => toggleFilter(f.key)}
            style={{ cursor: "pointer", background: active ? "var(--ink)" : "var(--brass-soft)", color: active ? "#fff" : "var(--brass)" }}
          >
            {f.label}
          </span>
        );
      })}
      {activeFilters.size > 0 && (
        <span style={{ fontSize: 11.5, color: "var(--mut)", cursor: "pointer", marginLeft: 4 }} onClick={() => toggleFilter(null, true)}>Clear filters ✕</span>
      )}
    </div>
  );
}

function SalesQueue({ leads, navigate }) {
  const [open, setOpen] = useState(true);
  const queue = buildSalesQueue(leads).slice(0, 15);
  return (
    <div className="dk-card" style={{ padding: 16, marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setOpen((v) => !v)}>
        <div>
          <div className="dk-eyebrow">Next Tasks</div>
          <div className="serif" style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>Sales Queue · {queue.length} to do</div>
        </div>
        <span style={{ fontSize: 12.5, color: "var(--mut)" }}>{open ? "▲ Collapse" : "▼ Expand"}</span>
      </div>
      {open && (
        <div style={{ marginTop: 10 }}>
          {queue.length === 0 && <div style={{ fontSize: 12.5, color: "var(--mut)" }}>Nothing pending — the queue is clear.</div>}
          {queue.map(({ lead, action, badge }) => (
            <div
              key={lead.id} className="dk-row"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 6px", borderBottom: "1px solid var(--line)", cursor: "pointer" }}
              onClick={() => navigate(`/admin/leads/${lead.id}`)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span>{action.icon}</span>
                <div>
                  <b style={{ fontSize: 13 }}>{action.label} — {lead.name}</b>
                  <div style={{ fontSize: 11, color: "var(--mut)" }}>{lead.leadCode} · {lead.scope || "—"}</div>
                </div>
              </div>
              {badge && <span className="dk-chip" style={{ background: badge.bg, color: badge.fg, fontSize: 10 }}>{badge.icon} {badge.label}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LeadCard({ lead, dragging, onDragStart, onDragEnd, onOpen, onCall, onWhatsapp, onScheduleVisit, onQuotation, onRecordAdvance }) {
  const [hovered, setHovered] = useState(false);
  const [popover, setPopover] = useState(null);
  const [visitDate, setVisitDate] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");

  const age = leadAge(lead.createdAt);
  const action = nextAction(lead);
  const badge = overdueBadge(lead);
  const priorityColor = lead.priority === "high" ? "var(--bad)" : lead.priority === "low" ? "var(--line)" : "var(--warn)";

  return (
    <div
      draggable
      onDragStart={onDragStart} onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPopover(null); }}
      className="dk-card"
      style={{ padding: 13, marginBottom: 10, cursor: "grab", opacity: dragging ? 0.4 : 1, userSelect: "none", borderLeft: `4px solid ${priorityColor}` }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 6 }}>
        <span style={{ fontSize: 10, color: "var(--mut)", fontWeight: 700 }}>{lead.leadCode}</span>
        {badge && <span className="dk-chip" style={{ background: badge.bg, color: badge.fg, fontSize: 9.5, padding: "2px 7px" }}>{badge.icon} {badge.label}</span>}
      </div>

      <div onClick={onOpen} style={{ fontSize: 14.5, fontWeight: 700, marginTop: 3, cursor: "pointer" }}>{lead.name}</div>
      <div className="serif" style={{ fontSize: 21, fontWeight: 600, marginTop: 4 }}>{formatINR(lead.statedBudgetPaise)}</div>
      <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>{lead.scope || "—"} · {SOURCE_LABEL[lead.source] || lead.source}</div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 9 }}>
        {age ? <span className="dk-chip" style={{ background: age.bg, color: age.fg, fontSize: 10 }}>{age.icon} {age.label}</span> : <span />}
        <span style={{ fontSize: 11.5, color: "var(--mut)" }}>👤 {lead.leadOwner || "Unassigned"}</span>
      </div>

      {action && (
        <div style={{ marginTop: 9, padding: "7px 9px", borderRadius: 8, background: "var(--brass-soft)", color: "var(--brass)", fontSize: 12, fontWeight: 700, textAlign: "center" }}>
          {action.icon} {action.label}
        </div>
      )}

      {hovered && !popover && (
        <div style={{ display: "flex", gap: 4, marginTop: 9, borderTop: "1px solid var(--line)", paddingTop: 9 }}>
          <button title="Call" onClick={(e) => { e.stopPropagation(); onCall(lead); }} style={ICON_BTN}>📞</button>
          <button title="WhatsApp" onClick={(e) => { e.stopPropagation(); onWhatsapp(lead); }} style={ICON_BTN}>💬</button>
          <button title="Schedule Visit" onClick={(e) => { e.stopPropagation(); setPopover("visit"); }} style={ICON_BTN}>📅</button>
          <button title="Generate Quotation" onClick={(e) => { e.stopPropagation(); setPopover("quote"); }} style={ICON_BTN}>📄</button>
          <button title="Record Advance" onClick={(e) => { e.stopPropagation(); onRecordAdvance(lead); }} style={ICON_BTN}>💰</button>
          <button title="Open Lead" onClick={(e) => { e.stopPropagation(); onOpen(); }} style={ICON_BTN}>↗</button>
        </div>
      )}

      {popover === "visit" && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 9, borderTop: "1px solid var(--line)", paddingTop: 9, display: "flex", gap: 4 }}>
          <input className="dk-input" type="date" style={{ fontSize: 11.5, padding: "5px 7px" }} value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          <button className="dk-btn" style={{ fontSize: 11, padding: "5px 8px" }} onClick={() => { if (visitDate) { onScheduleVisit(lead, visitDate); setPopover(null); setVisitDate(""); } }}>Set</button>
        </div>
      )}
      {popover === "quote" && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 9, borderTop: "1px solid var(--line)", paddingTop: 9, display: "flex", gap: 4 }}>
          <input className="dk-input" type="number" placeholder="₹ amount" style={{ fontSize: 11.5, padding: "5px 7px" }} value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} />
          <button className="dk-btn" style={{ fontSize: 11, padding: "5px 8px" }} onClick={() => { onQuotation(lead, quoteAmount); setPopover(null); setQuoteAmount(""); }}>Send</button>
        </div>
      )}
    </div>
  );
}

export default function SalesPipeline() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [leads, setLeads] = useState(null);
  const [adding, setAdding] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [boardError, setBoardError] = useState("");
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [lostModal, setLostModal] = useState(null);

  const load = () => api.get("/leads").then(({ leads }) => setLeads(leads));
  useEffect(() => { load(); }, []);

  const toggleFilter = (key, clearAll) => {
    setActiveFilters((prev) => {
      if (clearAll) return new Set();
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const changeStatus = async (lead, newStatus, extra = {}) => {
    if (!lead || lead.status === newStatus) return;
    setBoardError("");
    const prevLeads = leads;
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status: newStatus } : l)));
    try {
      const res = await api.patch(`/leads/${lead.id}`, { status: newStatus, ...extra });
      setLeads((ls) => ls.map((l) => (l.id === lead.id ? res.lead : l)));
      if (res.project) {
        setBoardError(`🎉 ${lead.name} is now project ${res.project.code} — code ${res.project.code}, PIN ${res.pin}. Share these with the client.`);
      }
    } catch (err) {
      setLeads(prevLeads);
      setBoardError(err.message || "Could not move this lead");
    }
  };

  const drop = (stage) => {
    setDragOverStage(null);
    const lead = leads.find((l) => l.id === draggingId);
    setDraggingId(null);
    if (!lead || lead.status === stage) return;
    if (stage === "lost") { setLostModal({ leadId: lead.id, leadName: lead.name }); return; }
    changeStatus(lead, stage);
  };

  const confirmLost = (reason) => {
    const lead = leads.find((l) => l.id === lostModal.leadId);
    setLostModal(null);
    changeStatus(lead, "lost", { lostReason: reason });
  };

  const logCall = (lead) => {
    if (lead.phone) window.location.href = `tel:${lead.phone}`;
    api.post(`/leads/${lead.id}/activities`, { type: "called", note: "Called via Sales Pipeline quick action" }).then(load).catch(() => {});
  };
  const logWhatsapp = (lead) => {
    window.open(whatsappLeadLink({ leadName: lead.name, phone: lead.whatsapp || lead.phone }), "_blank");
    api.post(`/leads/${lead.id}/activities`, { type: "whatsapp_sent", note: "Opened WhatsApp via Sales Pipeline quick action" }).then(load).catch(() => {});
  };
  const scheduleVisit = async (lead, date) => {
    await api.patch(`/leads/${lead.id}`, { siteVisitAt: date });
    await api.post(`/leads/${lead.id}/activities`, { type: "visit_scheduled", note: `Site visit scheduled for ${formatDate(date)}` });
    load();
  };
  const sendQuotation = async (lead, amount) => {
    if (amount) await api.patch(`/leads/${lead.id}`, { expectedRevenuePaise: Math.round(Number(amount) * 100) });
    await api.post(`/leads/${lead.id}/activities`, { type: "quotation_sent", note: amount ? `Sent quotation — ₹${amount}` : "Quotation sent" });
    load();
  };
  const recordAdvance = (lead) => {
    if (window.confirm(`Mark ${lead.name} as Advance Received? This creates the project.`)) changeStatus(lead, "advance-received");
  };

  if (!leads) return <Spinner />;

  const filteredLeads = leads.filter((l) => leadMatchesFilters(l, activeFilters, { userName: user?.name }));

  return (
    <div>
      <h1 className="serif" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>Sales Pipeline</h1>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 13, color: "var(--mut)" }}>Every lead before an advance payment — drag cards through the stages. Reaching "Advance Received" automatically creates the project.</div>
        <button className="dk-btn" onClick={() => setAdding((v) => !v)}>+ Add lead</button>
      </div>

      {adding && <div style={{ marginTop: 16 }}><AddLeadForm onAdded={load} onClose={() => setAdding(false)} /></div>}
      {boardError && (
        <div style={{ marginTop: 16, padding: 12, background: boardError.startsWith("🎉") ? "#E4EFE8" : "#F6E0DA", color: boardError.startsWith("🎉") ? "var(--ok)" : "var(--bad)", borderRadius: 10, fontSize: 12.5, display: "flex", justifyContent: "space-between", gap: 10 }}>
          <span>{boardError}</span>
          <span style={{ cursor: "pointer" }} onClick={() => setBoardError("")}>✕</span>
        </div>
      )}

      <PriorityCards leads={leads} activeFilters={activeFilters} toggleFilter={toggleFilter} />
      <Funnel leads={leads} />
      <QuickFilters activeFilters={activeFilters} toggleFilter={toggleFilter} />
      <SalesQueue leads={leads} navigate={navigate} />

      {lostModal && (
        <div className="dk-card" style={{ padding: 16, marginTop: 14, background: "#FBFAF6" }}>
          <div className="dk-eyebrow">Why was {lostModal.leadName} lost?</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {LOST_REASONS.map((r) => (
              <button key={r} className="dk-btn ghost" onClick={() => confirmLost(r)}>{r}</button>
            ))}
          </div>
          <button className="dk-btn ghost" style={{ marginTop: 10, color: "var(--bad)" }} onClick={() => setLostModal(null)}>Cancel</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 16, overflowX: "auto", paddingBottom: 12 }}>
        {LEAD_STAGES.map((stage) => {
          const stageLeads = filteredLeads.filter((l) => l.status === stage.key);
          const revenue = stageLeads.reduce((sum, l) => sum + (l.expectedRevenuePaise || 0), 0);
          return (
            <div
              key={stage.key}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.key); }}
              onDragLeave={() => setDragOverStage((s) => (s === stage.key ? null : s))}
              onDrop={(e) => { e.preventDefault(); drop(stage.key); }}
              style={{
                flex: "0 0 305px", background: dragOverStage === stage.key ? "var(--brass-soft)" : "#FBFAF6",
                borderRadius: 12, padding: 10, minHeight: 200, border: "1px solid var(--line)",
              }}
            >
              <div style={{ padding: "2px 4px 10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{stage.label}</span>
                  <span className="dk-chip" style={{ background: "var(--card)", color: "var(--mut)" }}>{stageLeads.length}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 2 }}>{stageLeads.length} Lead{stageLeads.length === 1 ? "" : "s"} · {formatINR(revenue)}</div>
              </div>
              {stageLeads.length === 0 && (
                <div style={{ fontSize: 12, color: "var(--mut)", padding: "16px 4px", textAlign: "center" }}>No leads in this stage.</div>
              )}
              {stageLeads.map((lead) => (
                <LeadCard
                  key={lead.id} lead={lead} dragging={draggingId === lead.id}
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", lead.id); e.dataTransfer.effectAllowed = "move"; setDraggingId(lead.id); }}
                  onDragEnd={() => setDraggingId(null)}
                  onOpen={() => navigate(`/admin/leads/${lead.id}`)}
                  onCall={logCall}
                  onWhatsapp={logWhatsapp}
                  onScheduleVisit={scheduleVisit}
                  onQuotation={sendQuotation}
                  onRecordAdvance={recordAdvance}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
