import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatINR, formatDate } from "../shared/format.js";
import { Spinner } from "../shared/ui.jsx";
import { LEAD_STAGES } from "../shared/leadStages.js";
import { whatsappLeadLink } from "../shared/contact.js";
import CallOutcomeModal from "./CallOutcomeModal.jsx";
import {
  PRIORITY_CARDS, QUICK_FILTERS, leadMatchesFilters, leadAge, nextAction, overdueBadge,
  computeFunnel, LOST_REASONS, buildSalesQueue, isSnoozed,
} from "../shared/pipelineHelpers.js";

const SOURCES = ["manual", "facebook", "google", "referral", "website"];
const SOURCE_LABEL = {
  manual: "Manual", facebook: "Facebook", google: "Google", referral: "Referral", website: "Website",
  "self-estimation": "Self-estimation", "design-upload": "Design upload",
};
const PAYMENT_METHODS = ["Cash", "Cheque", "Bank Transfer", "UPI", "Card", "Other"];
const NEGOTIATION_REASONS = ["Discount Requested", "Needs Time", "Family Decision", "Loan", "Other"];

const ICON_BTN = { flex: 1, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 6, padding: "5px 0", fontSize: 13, cursor: "pointer" };

function AddLeadForm({ onAdded, onClose }) {
  const [form, setForm] = useState({ name: "", city: "", phone: "", scope: "", budget: "", source: "manual", date: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await api.post("/leads", {
        name: form.name, city: form.city || null, phone: form.phone || null, scope: form.scope || null,
        statedBudgetPaise: form.budget ? Math.round(Number(form.budget) * 100) : null, source: form.source,
        createdAt: form.date ? new Date(`${form.date}T12:00:00.000Z`).toISOString() : undefined,
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
        <label style={{ fontSize: 11.5, color: "var(--mut)" }}>
          Lead date (optional — today if blank)
          <input className="dk-input" style={{ width: 160, marginTop: 2 }} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </label>
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

function SalesQueue({ leads, navigate, onCall }) {
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
          {queue.map(({ lead, action, badge }) => {
            const isCallAction = action.label === "Call Customer" || action.label === "Follow-up";
            return (
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
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {badge && <span className="dk-chip" style={{ background: badge.bg, color: badge.fg, fontSize: 10 }}>{badge.icon} {badge.label}</span>}
                  {isCallAction && (
                    <button className="dk-btn" style={{ fontSize: 11, padding: "5px 9px" }} onClick={(e) => { e.stopPropagation(); onCall(lead); }}>📞 Call</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SnoozedLeads({ leads, navigate }) {
  const snoozed = leads.filter(isSnoozed);
  if (!snoozed.length) return null;
  return (
    <div className="dk-card" style={{ padding: 16, marginTop: 14 }}>
      <div className="dk-eyebrow">😴 Snoozed Leads</div>
      <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2, marginBottom: 8 }}>Hidden from the active pipeline — reactivates automatically on its follow-up date.</div>
      {snoozed.map((lead) => (
        <div key={lead.id} className="dk-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 6px", borderBottom: "1px solid var(--line)", cursor: "pointer" }} onClick={() => navigate(`/admin/leads/${lead.id}`)}>
          <div>
            <b style={{ fontSize: 13 }}>{lead.name}</b>
            <div style={{ fontSize: 11, color: "var(--mut)" }}>{lead.leadCode} · {lead.snoozeReason || "Snoozed"}</div>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--mut)" }}>Wakes {formatDate(lead.snoozedUntil)}</span>
        </div>
      ))}
    </div>
  );
}

function LeadCard({ lead, dragging, onDragStart, onDragEnd, onOpen, onCallOutcome, onWhatsapp, onScheduleVisit, onVisitCompleted, onQuotation, onNegotiation, onRecordAdvance, onSnooze }) {
  const [hovered, setHovered] = useState(false);
  const [popover, setPopover] = useState(null);
  const [visitDate, setVisitDate] = useState("");
  const [snoozeDate, setSnoozeDate] = useState("");
  const [snoozeReason, setSnoozeReasonText] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteFollowUp, setQuoteFollowUp] = useState("tomorrow");
  const [vcRequirements, setVcRequirements] = useState(lead.requirements || "");
  const [vcNotes, setVcNotes] = useState("");
  const [vcFiles, setVcFiles] = useState([]);
  const [negReason, setNegReason] = useState(NEGOTIATION_REASONS[0]);
  const [negFollowUp, setNegFollowUp] = useState("");
  const [advAmount, setAdvAmount] = useState(lead.expectedRevenuePaise ? lead.expectedRevenuePaise / 100 : (lead.statedBudgetPaise ? lead.statedBudgetPaise / 100 : ""));
  const [advMethod, setAdvMethod] = useState(PAYMENT_METHODS[0]);
  const [advDate, setAdvDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const age = leadAge(lead.createdAt);
  const action = nextAction(lead);
  const badge = overdueBadge(lead);
  const priorityColor = lead.priority === "high" ? "var(--bad)" : lead.priority === "low" ? "var(--line)" : "var(--warn)";

  const actionKeys = lead.status === "visit-scheduled" ? ["visit-completed"]
    : ["visit-completed", "quotation-pending"].includes(lead.status) ? ["quotation"]
    : lead.status === "quotation-sent" ? ["negotiation", "advance"]
    : lead.status === "negotiation" ? ["advance"]
    : lead.status === "advance-received" ? []
    : ["visit"];

  const close = () => { setPopover(null); setBusy(false); };

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
          <button title="Call" onClick={(e) => { e.stopPropagation(); onCallOutcome(lead); }} style={ICON_BTN}>📞</button>
          <button title="WhatsApp" onClick={(e) => { e.stopPropagation(); onWhatsapp(lead); }} style={ICON_BTN}>💬</button>
          {actionKeys.includes("visit") && <button title="Schedule Visit" onClick={(e) => { e.stopPropagation(); setPopover("visit"); }} style={ICON_BTN}>📅</button>}
          {actionKeys.includes("visit-completed") && <button title="Mark Visit Completed" onClick={(e) => { e.stopPropagation(); setPopover("visit-completed"); }} style={ICON_BTN}>🏠</button>}
          {actionKeys.includes("quotation") && <button title="Generate Quotation" onClick={(e) => { e.stopPropagation(); setPopover("quote"); }} style={ICON_BTN}>📄</button>}
          {actionKeys.includes("negotiation") && <button title="Log Negotiation" onClick={(e) => { e.stopPropagation(); setPopover("negotiation"); }} style={ICON_BTN}>🤝</button>}
          {actionKeys.includes("advance") && <button title="Record Advance" onClick={(e) => { e.stopPropagation(); setPopover("advance"); }} style={ICON_BTN}>💰</button>}
          <button title={isSnoozed(lead) ? "Un-snooze" : "Snooze Lead"} onClick={(e) => { e.stopPropagation(); setPopover("snooze"); }} style={ICON_BTN}>😴</button>
          <button title="Open Lead" onClick={(e) => { e.stopPropagation(); onOpen(); }} style={ICON_BTN}>↗</button>
        </div>
      )}

      {popover === "snooze" && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 9, borderTop: "1px solid var(--line)", paddingTop: 9, display: "flex", flexDirection: "column", gap: 5 }}>
          {isSnoozed(lead) ? (
            <>
              <div style={{ fontSize: 11, color: "var(--mut)" }}>Snoozed until {lead.snoozedUntil?.slice(0, 10)}{lead.snoozeReason ? ` — ${lead.snoozeReason}` : ""}</div>
              <button className="dk-btn ghost" style={{ fontSize: 11, padding: "5px 8px" }} onClick={() => { onSnooze(lead, null, null); close(); }}>Un-snooze</button>
            </>
          ) : (
            <>
              <input className="dk-input" type="date" style={{ fontSize: 11.5, padding: "5px 7px" }} value={snoozeDate} onChange={(e) => setSnoozeDate(e.target.value)} />
              <input className="dk-input" placeholder="Reason (optional)" style={{ fontSize: 11.5, padding: "5px 7px" }} value={snoozeReason} onChange={(e) => setSnoozeReasonText(e.target.value)} />
              <button className="dk-btn" style={{ fontSize: 11, padding: "5px 8px" }} onClick={() => { if (snoozeDate) { onSnooze(lead, snoozeDate, snoozeReason); close(); setSnoozeDate(""); setSnoozeReasonText(""); } }}>Snooze</button>
            </>
          )}
        </div>
      )}

      {popover === "visit" && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 9, borderTop: "1px solid var(--line)", paddingTop: 9, display: "flex", gap: 4 }}>
          <input className="dk-input" type="date" style={{ fontSize: 11.5, padding: "5px 7px" }} value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          <button className="dk-btn" style={{ fontSize: 11, padding: "5px 8px" }} onClick={() => { if (visitDate) { onScheduleVisit(lead, visitDate); close(); setVisitDate(""); } }}>Set</button>
        </div>
      )}

      {popover === "visit-completed" && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 9, borderTop: "1px solid var(--line)", paddingTop: 9, display: "flex", flexDirection: "column", gap: 5 }}>
          <input type="file" accept="image/*,video/*" multiple onChange={(e) => setVcFiles([...e.target.files])} style={{ fontSize: 11 }} />
          <textarea className="dk-textarea" style={{ fontSize: 11.5, minHeight: 44 }} placeholder="Requirements" value={vcRequirements} onChange={(e) => setVcRequirements(e.target.value)} />
          <input className="dk-input" style={{ fontSize: 11.5, padding: "5px 7px" }} placeholder="Notes" value={vcNotes} onChange={(e) => setVcNotes(e.target.value)} />
          <button className="dk-btn" style={{ fontSize: 11, padding: "5px 8px" }} disabled={busy} onClick={async () => { setBusy(true); await onVisitCompleted(lead, { requirements: vcRequirements, notes: vcNotes, files: vcFiles }); close(); }}>{busy ? "Saving…" : "Mark Completed"}</button>
        </div>
      )}

      {popover === "quote" && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 9, borderTop: "1px solid var(--line)", paddingTop: 9, display: "flex", flexDirection: "column", gap: 5 }}>
          <input className="dk-input" type="number" placeholder="₹ amount" style={{ fontSize: 11.5, padding: "5px 7px" }} value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} />
          <div style={{ fontSize: 10.5, color: "var(--mut)" }}>Follow up:</div>
          <div style={{ display: "flex", gap: 4 }}>
            {["tomorrow", "2days", "custom"].map((f) => (
              <button key={f} className={`dk-btn ${quoteFollowUp === f ? "" : "ghost"}`} style={{ fontSize: 10.5, padding: "4px 7px" }} onClick={() => setQuoteFollowUp(f)}>{f === "tomorrow" ? "Tomorrow" : f === "2days" ? "2 Days" : "Custom"}</button>
            ))}
          </div>
          {quoteFollowUp === "custom" && <input className="dk-input" type="date" style={{ fontSize: 11.5, padding: "5px 7px" }} onChange={(e) => setQuoteFollowUp(e.target.value)} />}
          <button className="dk-btn" style={{ fontSize: 11, padding: "5px 8px" }} onClick={() => { onQuotation(lead, quoteAmount, quoteFollowUp); close(); setQuoteAmount(""); }}>Send</button>
        </div>
      )}

      {popover === "negotiation" && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 9, borderTop: "1px solid var(--line)", paddingTop: 9, display: "flex", flexDirection: "column", gap: 5 }}>
          <select className="dk-select" style={{ fontSize: 11.5, padding: "5px 7px" }} value={negReason} onChange={(e) => setNegReason(e.target.value)}>
            {NEGOTIATION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input className="dk-input" type="date" style={{ fontSize: 11.5, padding: "5px 7px" }} value={negFollowUp} onChange={(e) => setNegFollowUp(e.target.value)} />
          <button className="dk-btn" style={{ fontSize: 11, padding: "5px 8px" }} onClick={() => { if (negFollowUp) { onNegotiation(lead, negReason, negFollowUp); close(); } }}>Log</button>
        </div>
      )}

      {popover === "advance" && (
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 9, borderTop: "1px solid var(--line)", paddingTop: 9, display: "flex", flexDirection: "column", gap: 5 }}>
          <input className="dk-input" type="number" placeholder="Advance amount (₹)" style={{ fontSize: 11.5, padding: "5px 7px" }} value={advAmount} onChange={(e) => setAdvAmount(e.target.value)} />
          <select className="dk-select" style={{ fontSize: 11.5, padding: "5px 7px" }} value={advMethod} onChange={(e) => setAdvMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input className="dk-input" type="date" style={{ fontSize: 11.5, padding: "5px 7px" }} value={advDate} onChange={(e) => setAdvDate(e.target.value)} />
          <button className="dk-btn" style={{ fontSize: 11, padding: "5px 8px" }} disabled={busy} onClick={async () => { setBusy(true); await onRecordAdvance(lead, advAmount, advMethod, advDate); close(); }}>{busy ? "Saving…" : "Record & Create Project"}</button>
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
  const [callOutcomeLead, setCallOutcomeLead] = useState(null);

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

  const submitCallOutcome = async (payload) => {
    await api.post(`/leads/${callOutcomeLead.id}/call-outcome`, payload);
    load();
  };

  const toggleSnooze = async (lead, date, reason) => {
    await api.patch(`/leads/${lead.id}`, { snoozedUntil: date || "", snoozeReason: reason || "" });
    load();
  };

  const logWhatsapp = (lead) => {
    window.open(whatsappLeadLink({ leadName: lead.name, phone: lead.whatsapp || lead.phone }), "_blank");
    api.post(`/leads/${lead.id}/activities`, { type: "whatsapp_sent", note: "Opened WhatsApp via Sales Pipeline quick action" }).then(load).catch(() => {});
  };
  const scheduleVisit = async (lead, date) => {
    await api.patch(`/leads/${lead.id}`, { siteVisitAt: date, status: "visit-scheduled" });
    await api.post(`/leads/${lead.id}/activities`, { type: "visit_scheduled", note: `Site visit scheduled for ${formatDate(date)}` });
    load();
  };
  const visitCompleted = async (lead, { requirements, notes, files }) => {
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      const { filePath, kind } = await api.post("/uploads", form, { isForm: true });
      await api.post(`/leads/${lead.id}/files`, { filePath, fileName: file.name, kind });
    }
    await api.patch(`/leads/${lead.id}`, { status: "visit-completed", requirements: requirements || undefined, notes: notes || undefined });
    await api.post(`/leads/${lead.id}/activities`, { type: "visit_completed", note: notes || "Site visit completed" });
    load();
  };
  const sendQuotation = async (lead, amount, followUp) => {
    const followUpAt = followUp === "tomorrow" ? new Date(Date.now() + 86400000).toISOString().slice(0, 10)
      : followUp === "2days" ? new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
      : followUp; // custom date already an ISO date string
    if (amount) await api.patch(`/leads/${lead.id}`, { expectedRevenuePaise: Math.round(Number(amount) * 100), status: "quotation-sent", followUpAt });
    else await api.patch(`/leads/${lead.id}`, { status: "quotation-sent", followUpAt });
    await api.post(`/leads/${lead.id}/activities`, { type: "quotation_sent", note: amount ? `Sent quotation — ₹${amount}` : "Quotation sent" });
    load();
  };
  const logNegotiation = async (lead, reason, followUpAt) => {
    await api.patch(`/leads/${lead.id}`, { status: "negotiation", followUpAt });
    await api.post(`/leads/${lead.id}/activities`, { type: "note", note: `Negotiation — ${reason}` });
    load();
  };
  const recordAdvance = async (lead, amount, method, date) => {
    if (!amount) { setBoardError("Enter an advance amount before recording it."); return; }
    setBoardError("");
    const prevLeads = leads;
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status: "advance-received" } : l)));
    try {
      const res = await api.patch(`/leads/${lead.id}`, {
        status: "advance-received", expectedRevenuePaise: Math.round(Number(amount) * 100),
        advanceAmountPaise: Math.round(Number(amount) * 100), advancePaymentMethod: method, advancePaidAt: date,
      });
      setLeads((ls) => ls.map((l) => (l.id === lead.id ? res.lead : l)));
      if (res.project) setBoardError(`🎉 ${lead.name} is now project ${res.project.code} — code ${res.project.code}, PIN ${res.pin}. Share these with the client.`);
    } catch (err) {
      setLeads(prevLeads);
      setBoardError(err.message || "Could not record this advance");
    }
  };

  if (!leads) return <Spinner />;

  const filteredLeads = leads.filter((l) => !isSnoozed(l) && leadMatchesFilters(l, activeFilters, { userName: user?.name }));

  return (
    <div>
      <h1 className="serif" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>Sales Pipeline</h1>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 13, color: "var(--mut)" }}>Record what happened on each call — the system moves the lead, schedules the next action, and updates the board automatically. Dragging still works for exceptional cases.</div>
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
      <SalesQueue leads={leads} navigate={navigate} onCall={setCallOutcomeLead} />
      <SnoozedLeads leads={leads} navigate={navigate} />

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

      {callOutcomeLead && (
        <CallOutcomeModal lead={callOutcomeLead} onClose={() => setCallOutcomeLead(null)} onSubmit={submitCallOutcome} />
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
                  onCallOutcome={setCallOutcomeLead}
                  onWhatsapp={logWhatsapp}
                  onScheduleVisit={scheduleVisit}
                  onVisitCompleted={visitCompleted}
                  onQuotation={sendQuotation}
                  onNegotiation={logNegotiation}
                  onRecordAdvance={recordAdvance}
                  onSnooze={toggleSnooze}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
