import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { formatINR, formatDate, timeAgo } from "../shared/format.js";
import { Chip } from "../shared/ui.jsx";
import { LEAD_STAGES, PRIORITIES, INTEREST_LEVELS, ACTIVITY_TYPES, ACTIVITY_META } from "../shared/leadStages.js";

const SOURCES = ["manual", "facebook", "google", "referral", "website", "self-estimation", "design-upload"];
const SOURCE_LABEL = { manual: "Manual", facebook: "Facebook", google: "Google", referral: "Referral", website: "Website", "self-estimation": "Self-estimation tool", "design-upload": "Design upload" };

function ActivityTimeline({ leadId, onLogged }) {
  const [activities, setActivities] = useState(null);
  const [type, setType] = useState(ACTIVITY_TYPES[0].key);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => api.get(`/leads/${leadId}/activities`).then(({ activities }) => setActivities(activities));
  useEffect(() => { load(); }, [leadId]);

  const add = async () => {
    setSaving(true);
    try {
      const res = await api.post(`/leads/${leadId}/activities`, { type, note: note.trim() || null });
      setNote("");
      load();
      onLogged?.(res.lead);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 18 }}>
      <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Activity timeline</div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
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
          <div key={a.id} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--brass-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{meta.icon}</span>
              <span style={{ width: 1, flex: 1, background: "var(--line)", marginTop: 2 }} />
            </div>
            <div style={{ paddingBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{meta.label}</div>
              {a.note && <div style={{ fontSize: 12.5, color: "var(--mut)", marginTop: 1 }}>{a.note}</div>}
              <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 2 }}>
                {timeAgo(a.createdAt)}{a.createdBy ? ` · ${a.createdBy}` : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function LeadDrawer({ lead, onClose, onFieldChange, onDelete }) {
  const [error, setError] = useState("");
  const [converted, setConverted] = useState(null); // { project, clientPassword, pin }
  const [text, setText] = useState({
    name: lead.name, city: lead.city || "", phone: lead.phone || "", whatsapp: lead.whatsapp || "",
    email: lead.email || "", address: lead.address || "", scope: lead.scope || "",
    leadOwner: lead.leadOwner || "", notes: lead.notes || "",
  });
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState(lead.tags || []);
  const [lastContactDate, setLastContactDate] = useState(lead.lastContactDate);

  const change = async (field, value) => {
    setError("");
    try {
      const res = await onFieldChange(lead.id, field, value);
      if (res?.project) setConverted({ project: res.project, clientPassword: res.clientPassword, pin: res.pin });
      return res;
    } catch (err) {
      setError(err.message || "Could not update lead");
    }
  };

  const blurField = (field) => () => {
    const value = text[field];
    if (value !== (lead[field] || "")) change(field, value);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setTagInput("");
    change("tags", next);
  };
  const removeTag = (t) => {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    change("tags", next);
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
      <div className="dk-card" style={{ width: 460, maxWidth: "90vw", height: "100%", borderRadius: 0, padding: 24, overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <div className="dk-eyebrow">{lead.leadCode || "—"} · {SOURCE_LABEL[lead.source] || lead.source}</div>
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

        <div className="dk-eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>Contact</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 11.5, color: "var(--mut)" }}>Phone
            <input className="dk-input" style={{ marginTop: 2 }} value={text.phone} onChange={(e) => setText((t) => ({ ...t, phone: e.target.value }))} onBlur={blurField("phone")} placeholder="Required before Advance Received" />
          </label>
          <label style={{ fontSize: 11.5, color: "var(--mut)" }}>WhatsApp
            <input className="dk-input" style={{ marginTop: 2 }} value={text.whatsapp} onChange={(e) => setText((t) => ({ ...t, whatsapp: e.target.value }))} onBlur={blurField("whatsapp")} placeholder="If different from phone" />
          </label>
          <label style={{ fontSize: 11.5, color: "var(--mut)" }}>Email
            <input className="dk-input" style={{ marginTop: 2 }} value={text.email} onChange={(e) => setText((t) => ({ ...t, email: e.target.value }))} onBlur={blurField("email")} />
          </label>
          <label style={{ fontSize: 11.5, color: "var(--mut)" }}>City
            <input className="dk-input" style={{ marginTop: 2 }} value={text.city} onChange={(e) => setText((t) => ({ ...t, city: e.target.value }))} onBlur={blurField("city")} />
          </label>
          <label style={{ fontSize: 11.5, color: "var(--mut)" }}>Address
            <input className="dk-input" style={{ marginTop: 2 }} value={text.address} onChange={(e) => setText((t) => ({ ...t, address: e.target.value }))} onBlur={blurField("address")} />
          </label>
          <label style={{ fontSize: 11.5, color: "var(--mut)" }}>Property type
            <input className="dk-input" style={{ marginTop: 2 }} value={text.scope} onChange={(e) => setText((t) => ({ ...t, scope: e.target.value }))} onBlur={blurField("scope")} placeholder="e.g. 3BHK · Modular kitchen" />
          </label>
          <label style={{ fontSize: 11.5, color: "var(--mut)" }}>Source
            <select className="dk-select" style={{ marginTop: 2 }} value={lead.source} onChange={(e) => change("source", e.target.value)}>
              {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
            </select>
          </label>
        </div>

        <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.8 }}>
          <div><b>Their stated budget:</b> {formatINR(lead.statedBudgetPaise)}</div>
          <div><b>AI estimate:</b> {lead.aiEstimateLowPaise ? `${formatINR(lead.aiEstimateLowPaise)} – ${formatINR(lead.aiEstimateHighPaise)}` : "—"}</div>
          <div><b>Captured:</b> {formatDate(lead.createdAt)}</div>
          <div><b>Last contact:</b> {lastContactDate ? timeAgo(lastContactDate) : "Never"}</div>
        </div>

        <div className="dk-eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>Lead status</div>
        <select className="dk-select" value={lead.status} onChange={(e) => change("status", e.target.value)}>
          {LEAD_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>

        <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Priority</div>
            <div style={{ display: "flex", gap: 6 }}>
              {PRIORITIES.map((p) => (
                <button key={p} className={`dk-btn ${lead.priority === p ? "" : "ghost"}`} style={{ padding: "6px 8px" }} onClick={() => change("priority", p)}>
                  <Chip status={p} />
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Interest level</div>
            <div style={{ display: "flex", gap: 6 }}>
              {INTEREST_LEVELS.map((l) => (
                <button key={l} className={`dk-btn ${lead.interestLevel === l ? "" : "ghost"}`} style={{ padding: "6px 8px" }} onClick={() => change("interestLevel", l)}>
                  <Chip status={l} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Lead owner</div>
          <input
            className="dk-input" value={text.leadOwner} placeholder="e.g. Priya"
            onChange={(e) => setText((t) => ({ ...t, leadOwner: e.target.value }))} onBlur={blurField("leadOwner")}
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

        <div style={{ marginTop: 18 }}>
          <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Tags</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {tags.map((t) => (
              <span key={t} className="dk-chip" style={{ background: "var(--brass-soft)", color: "var(--brass)", cursor: "pointer" }} onClick={() => removeTag(t)}>{t} ✕</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input className="dk-input" placeholder="Add a tag…" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} />
            <button className="dk-btn ghost" onClick={addTag}>Add</button>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Notes</div>
          <textarea
            className="dk-textarea" value={text.notes} placeholder="Anything worth remembering about this lead…"
            onChange={(e) => setText((t) => ({ ...t, notes: e.target.value }))} onBlur={blurField("notes")}
          />
        </div>

        {lead.convertedProjectId && (
          <div style={{ marginTop: 18, fontSize: 12.5, color: "var(--ok)" }}>✓ Converted to a project already.</div>
        )}

        <ActivityTimeline leadId={lead.id} onLogged={(updated) => setLastContactDate(updated.lastContactDate)} />

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
