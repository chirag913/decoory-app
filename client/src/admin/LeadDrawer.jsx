import { useState } from "react";
import { formatINR, formatDate } from "../shared/format.js";
import { Chip } from "../shared/ui.jsx";
import { LEAD_STAGES, PRIORITIES } from "../shared/leadStages.js";

export default function LeadDrawer({ lead, onClose, onFieldChange, onDelete }) {
  const [error, setError] = useState("");
  const [converted, setConverted] = useState(null); // { project, clientPassword, pin }
  const [text, setText] = useState({ name: lead.name, city: lead.city || "", phone: lead.phone || "", scope: lead.scope || "", assignedSalesperson: lead.assignedSalesperson || "" });

  const change = async (field, value) => {
    setError("");
    try {
      const res = await onFieldChange(lead.id, field, value);
      if (res?.project) setConverted({ project: res.project, clientPassword: res.clientPassword, pin: res.pin });
    } catch (err) {
      setError(err.message || "Could not update lead");
    }
  };

  const blurField = (field) => () => {
    const value = text[field];
    if (value !== (lead[field] || "")) change(field, value);
  };

  if (converted) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(30,38,34,.4)", zIndex: 100, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
        <div className="dk-card" style={{ width: 420, maxWidth: "90vw", height: "100%", borderRadius: 0, padding: 24, overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
          <div className="dk-eyebrow" style={{ color: "var(--ok)" }}>🎉 Project created</div>
          <div className="serif" style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{converted.project.name} — {converted.project.code}</div>
          <div style={{ fontSize: 13, marginTop: 12, lineHeight: 1.8 }}>
            {lead.name} is now a project. Share these with the client so they can log in:<br />
            <b>Project code:</b> {converted.project.code} &nbsp; <b>PIN:</b> {converted.pin}<br />
            {converted.clientPassword && <><b>Password</b> (if they'd rather use email/phone login): <code>{converted.clientPassword}</code></>}
          </div>
          <button className="dk-btn" style={{ marginTop: 16 }} onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(30,38,34,.4)", zIndex: 100, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div className="dk-card" style={{ width: 440, maxWidth: "90vw", height: "100%", borderRadius: 0, padding: 24, overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <div className="dk-eyebrow">{lead.source.replace("-", " ")}</div>
            <input
              className="dk-input" style={{ marginTop: 4, fontSize: 18, fontWeight: 600, fontFamily: "'Fraunces', Georgia, serif", padding: "4px 8px" }}
              value={text.name} onChange={(e) => setText((t) => ({ ...t, name: e.target.value }))} onBlur={blurField("name")}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="dk-btn ghost" style={{ color: "var(--bad)" }} onClick={() => onDelete(lead)}>Delete</button>
            <button className="dk-btn ghost" onClick={onClose}>✕</button>
          </div>
        </div>

        {error && <div style={{ fontSize: 12.5, color: "var(--bad)", marginTop: 10 }}>{error}</div>}

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 11.5, color: "var(--mut)" }}>City
            <input className="dk-input" style={{ marginTop: 2 }} value={text.city} onChange={(e) => setText((t) => ({ ...t, city: e.target.value }))} onBlur={blurField("city")} />
          </label>
          <label style={{ fontSize: 11.5, color: "var(--mut)" }}>Phone
            <input className="dk-input" style={{ marginTop: 2 }} value={text.phone} onChange={(e) => setText((t) => ({ ...t, phone: e.target.value }))} onBlur={blurField("phone")} placeholder="Required before Advance Received" />
          </label>
          <label style={{ fontSize: 11.5, color: "var(--mut)" }}>Property type / scope
            <input className="dk-input" style={{ marginTop: 2 }} value={text.scope} onChange={(e) => setText((t) => ({ ...t, scope: e.target.value }))} onBlur={blurField("scope")} placeholder="e.g. 3BHK · Modular kitchen" />
          </label>
        </div>

        <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.8 }}>
          <div><b>Their stated budget:</b> {formatINR(lead.statedBudgetPaise)}</div>
          <div><b>AI estimate:</b> {lead.aiEstimateLowPaise ? `${formatINR(lead.aiEstimateLowPaise)} – ${formatINR(lead.aiEstimateHighPaise)}` : "—"}</div>
          <div><b>Captured:</b> {formatDate(lead.createdAt)}</div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Pipeline stage</div>
          <select className="dk-select" value={lead.status} onChange={(e) => change("status", e.target.value)}>
            {LEAD_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Priority</div>
          <div style={{ display: "flex", gap: 8 }}>
            {PRIORITIES.map((p) => (
              <button key={p} className={`dk-btn ${lead.priority === p ? "" : "ghost"}`} onClick={() => change("priority", p)}>
                <Chip status={p} />
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Assigned salesperson</div>
          <input
            className="dk-input" value={text.assignedSalesperson} placeholder="e.g. Priya"
            onChange={(e) => setText((t) => ({ ...t, assignedSalesperson: e.target.value }))} onBlur={blurField("assignedSalesperson")}
          />
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Expected revenue</div>
          <input
            className="dk-input" type="number" placeholder="₹" defaultValue={lead.expectedRevenuePaise ? lead.expectedRevenuePaise / 100 : ""}
            onBlur={(e) => change("expectedRevenuePaise", e.target.value ? Math.round(Number(e.target.value) * 100) : null)}
          />
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Next follow-up</div>
            <input className="dk-input" type="date" value={lead.followUpAt ? lead.followUpAt.slice(0, 10) : ""} onChange={(e) => change("followUpAt", e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Site visit</div>
            <input className="dk-input" type="date" value={lead.siteVisitAt ? lead.siteVisitAt.slice(0, 10) : ""} onChange={(e) => change("siteVisitAt", e.target.value)} />
          </div>
        </div>

        {lead.convertedProjectId && (
          <div style={{ marginTop: 18, fontSize: 12.5, color: "var(--ok)" }}>✓ Converted to a project already.</div>
        )}

        {lead.searchData && (
          <div style={{ marginTop: 18 }}>
            <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Everything they entered</div>
            <pre style={{ background: "var(--paper)", borderRadius: 8, padding: 12, fontSize: 12, overflowX: "auto", whiteSpace: "pre-wrap" }}>
              {JSON.stringify(lead.searchData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
