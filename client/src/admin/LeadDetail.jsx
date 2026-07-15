import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, resolveMediaUrl } from "../api/client.js";
import { formatINR, formatDate } from "../shared/format.js";
import { Chip, Spinner } from "../shared/ui.jsx";
import { LEAD_STAGES, PRIORITIES, INTEREST_LEVELS } from "../shared/leadStages.js";
import { whatsappLeadLink } from "../shared/contact.js";
import ActivityTimeline from "./ActivityTimeline.jsx";

const SOURCES = ["manual", "facebook", "google", "referral", "website", "self-estimation", "design-upload"];
const SOURCE_LABEL = { manual: "Manual", facebook: "Facebook", google: "Google", referral: "Referral", website: "Website", "self-estimation": "Self-estimation tool", "design-upload": "Design upload" };

function Section({ title, children }) {
  return (
    <div className="dk-card" style={{ padding: 16, marginBottom: 14 }}>
      <div className="dk-eyebrow" style={{ marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ fontSize: 11.5, color: "var(--mut)", display: "block", marginBottom: 10 }}>
      {label}
      <div style={{ marginTop: 2 }}>{children}</div>
    </label>
  );
}

// "Schedule Visit" / "Generate Quotation" both need a tiny inline form that
// expands under the quick-action button rather than a modal — reused here.
function InlineForm({ children, onCancel, onSubmit, submitLabel, saving }) {
  return (
    <div className="dk-card" style={{ padding: 12, marginTop: 8, background: "#FBFAF6" }}>
      {children}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button className="dk-btn" style={{ fontSize: 12, padding: "6px 10px" }} disabled={saving} onClick={onSubmit}>{saving ? "…" : submitLabel}</button>
        <button className="dk-btn ghost" style={{ fontSize: 12, padding: "6px 10px" }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState(null);
  const [files, setFiles] = useState(null);
  const [error, setError] = useState("");
  const [converted, setConverted] = useState(null);
  const [text, setText] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [uploading, setUploading] = useState(false);

  const loadLead = () => api.get(`/leads/${id}`).then(({ lead }) => {
    setLead(lead);
    setText({
      name: lead.name, city: lead.city || "", phone: lead.phone || "", whatsapp: lead.whatsapp || "",
      email: lead.email || "", address: lead.address || "", scope: lead.scope || "", leadOwner: lead.leadOwner || "",
      requirements: lead.requirements || "", notes: lead.notes || "",
    });
  });
  const loadActivities = () => api.get(`/leads/${id}/activities`).then(({ activities }) => setActivities(activities));
  const loadFiles = () => api.get(`/leads/${id}/files`).then(({ files }) => setFiles(files));

  useEffect(() => { loadLead(); loadActivities(); loadFiles(); }, [id]);

  const change = async (field, value) => {
    setError("");
    try {
      const res = await api.patch(`/leads/${id}`, { [field]: value });
      setLead(res.lead);
      if (res.project) setConverted({ project: res.project, clientPassword: res.clientPassword, pin: res.pin });
      return res;
    } catch (err) {
      setError(err.message || "Could not update lead");
      throw err;
    }
  };

  const blurField = (field) => () => {
    const value = text[field];
    if (value !== (lead[field] || "")) change(field, value);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || (lead.tags || []).includes(t)) return;
    tagInput && setTagInput("");
    change("tags", [...(lead.tags || []), t]);
  };
  const removeTag = (t) => change("tags", (lead.tags || []).filter((x) => x !== t));

  const logQuick = (type, note) => {
    api.post(`/leads/${id}/activities`, { type, note }).then(({ lead: updated }) => {
      setLead(updated);
      loadActivities();
    }).catch(() => {});
  };

  const removeLead = async () => {
    if (!window.confirm(`Delete the lead for ${lead.name}? This cannot be undone.`)) return;
    await api.del(`/leads/${id}`);
    navigate(-1);
  };

  const confirmVisit = async () => {
    if (!visitDate) return;
    setScheduling(false);
    await change("siteVisitAt", visitDate);
    logQuick("visit_scheduled", `Site visit scheduled for ${formatDate(visitDate)}`);
    setVisitDate("");
  };

  const confirmQuote = async () => {
    setQuoting(false);
    if (quoteAmount) await change("expectedRevenuePaise", Math.round(Number(quoteAmount) * 100));
    logQuick("quotation_sent", quoteNote.trim() || (quoteAmount ? `Sent quotation — ₹${quoteAmount}` : "Quotation sent"));
    setQuoteAmount("");
    setQuoteNote("");
  };

  const uploadFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { filePath, kind } = await api.post("/uploads", form, { isForm: true });
      await api.post(`/leads/${id}/files`, { filePath, fileName: file.name, kind });
      loadFiles();
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (fileId) => {
    await api.del(`/leads/${id}/files/${fileId}`);
    loadFiles();
  };

  if (!lead || !text) return <Spinner />;

  if (converted) {
    return (
      <div className="dk-card" style={{ padding: 24, maxWidth: 460, margin: "40px auto" }}>
        <div className="dk-eyebrow" style={{ color: "var(--ok)" }}>🎉 Project created</div>
        <div className="serif" style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>{converted.project.name} — {converted.project.code}</div>
        <div style={{ fontSize: 13, marginTop: 12, lineHeight: 1.8 }}>
          {lead.name} is now a project. Share these with the client so they can log in:<br />
          <b>Project code:</b> {converted.project.code} &nbsp; <b>PIN:</b> {converted.pin}<br />
          {converted.clientPassword && <><b>Password</b> (if they'd rather use email/phone login): <code>{converted.clientPassword}</code></>}
        </div>
        <button className="dk-btn" style={{ marginTop: 16 }} onClick={() => navigate(`/admin/projects/${converted.project.id}`)}>Go to project</button>
      </div>
    );
  }

  const quotationHistory = (activities || []).filter((a) => a.type === "quotation_sent");
  const followUpUpcoming = lead.followUpAt && lead.followUpAt.slice(0, 10) >= new Date().toISOString().slice(0, 10);
  const visitUpcoming = lead.siteVisitAt && lead.siteVisitAt.slice(0, 10) >= new Date().toISOString().slice(0, 10);

  return (
    <div>
      <button className="dk-btn ghost" onClick={() => navigate(-1)} style={{ marginBottom: 14 }}>← Back</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div className="dk-eyebrow">{lead.leadCode} · {SOURCE_LABEL[lead.source] || lead.source}</div>
          <input
            className="dk-input" style={{ marginTop: 4, fontSize: 26, fontWeight: 600, fontFamily: "'Fraunces', Georgia, serif", padding: "4px 8px", border: "none" }}
            value={text.name} onChange={(e) => setText((t) => ({ ...t, name: e.target.value }))} onBlur={blurField("name")}
          />
        </div>
        <button className="dk-btn ghost" style={{ color: "var(--bad)" }} onClick={removeLead}>Delete lead</button>
      </div>

      {error && <div style={{ fontSize: 12.5, color: "var(--bad)", marginTop: 10 }}>{error}</div>}
      {lead.convertedProjectId && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--ok)" }}>
          ✓ Converted to a project already. <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => navigate(`/admin/projects/${lead.convertedProjectId}`)}>View project →</span>
        </div>
      )}

      {/* At-a-glance strip: status/priority/interest/tags — the fields that don't fit any single left-column section but need to stay visible & editable */}
      <div className="dk-card" style={{ padding: 14, marginTop: 14, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <div className="dk-eyebrow" style={{ marginBottom: 6 }}>Lead status</div>
          <select className="dk-select" style={{ width: 200 }} value={lead.status} onChange={(e) => change("status", e.target.value)}>
            {LEAD_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <div className="dk-eyebrow" style={{ marginBottom: 6 }}>Priority</div>
          <div style={{ display: "flex", gap: 6 }}>
            {PRIORITIES.map((p) => (
              <button key={p} className={`dk-btn ${lead.priority === p ? "" : "ghost"}`} style={{ padding: "6px 8px" }} onClick={() => change("priority", p)}><Chip status={p} /></button>
            ))}
          </div>
        </div>
        <div>
          <div className="dk-eyebrow" style={{ marginBottom: 6 }}>Interest level</div>
          <div style={{ display: "flex", gap: 6 }}>
            {INTEREST_LEVELS.map((l) => (
              <button key={l} className={`dk-btn ${lead.interestLevel === l ? "" : "ghost"}`} style={{ padding: "6px 8px" }} onClick={() => change("interestLevel", l)}><Chip status={l} /></button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="dk-eyebrow" style={{ marginBottom: 6 }}>Tags</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {(lead.tags || []).map((t) => (
              <span key={t} className="dk-chip" style={{ background: "var(--brass-soft)", color: "var(--brass)", cursor: "pointer" }} onClick={() => removeTag(t)}>{t} ✕</span>
            ))}
            <input className="dk-input" style={{ width: 140, display: "inline-block" }} placeholder="Add a tag…" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} />
          </div>
        </div>
      </div>

      {/* Left / Middle / Right three-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr 0.85fr", gap: 16, marginTop: 16, alignItems: "start" }}>
        {/* LEFT: Customer Information / Property Information / Budget / Requirements / Notes */}
        <div>
          <Section title="Customer information">
            <Field label="Phone"><input className="dk-input" value={text.phone} onChange={(e) => setText((t) => ({ ...t, phone: e.target.value }))} onBlur={blurField("phone")} placeholder="Required before Advance Received" /></Field>
            <Field label="WhatsApp"><input className="dk-input" value={text.whatsapp} onChange={(e) => setText((t) => ({ ...t, whatsapp: e.target.value }))} onBlur={blurField("whatsapp")} placeholder="If different from phone" /></Field>
            <Field label="Email"><input className="dk-input" value={text.email} onChange={(e) => setText((t) => ({ ...t, email: e.target.value }))} onBlur={blurField("email")} /></Field>
            <Field label="City"><input className="dk-input" value={text.city} onChange={(e) => setText((t) => ({ ...t, city: e.target.value }))} onBlur={blurField("city")} /></Field>
            <Field label="Address"><input className="dk-input" value={text.address} onChange={(e) => setText((t) => ({ ...t, address: e.target.value }))} onBlur={blurField("address")} /></Field>
            <Field label="Lead owner"><input className="dk-input" value={text.leadOwner} onChange={(e) => setText((t) => ({ ...t, leadOwner: e.target.value }))} onBlur={blurField("leadOwner")} placeholder="e.g. Priya" /></Field>
            <Field label="Source">
              <select className="dk-select" value={lead.source} onChange={(e) => change("source", e.target.value)}>
                {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
              </select>
            </Field>
          </Section>

          <Section title="Property information">
            <Field label="Property type">
              <input className="dk-input" value={text.scope} onChange={(e) => setText((t) => ({ ...t, scope: e.target.value }))} onBlur={blurField("scope")} placeholder="e.g. 3BHK · Modular kitchen" />
            </Field>
          </Section>

          <Section title="Budget">
            <div style={{ fontSize: 13, lineHeight: 1.9 }}>
              <div><b>Their stated budget:</b> {formatINR(lead.statedBudgetPaise)}</div>
              <div><b>AI estimate:</b> {lead.aiEstimateLowPaise ? `${formatINR(lead.aiEstimateLowPaise)} – ${formatINR(lead.aiEstimateHighPaise)}` : "—"}</div>
            </div>
            <Field label="Expected revenue">
              <input className="dk-input" type="number" placeholder="₹" defaultValue={lead.expectedRevenuePaise ? lead.expectedRevenuePaise / 100 : ""} onBlur={(e) => change("expectedRevenuePaise", e.target.value ? Math.round(Number(e.target.value) * 100) : null)} />
            </Field>
          </Section>

          <Section title="Requirements">
            <textarea className="dk-textarea" value={text.requirements} placeholder="What they specifically need — rooms, must-haves, timeline expectations…" onChange={(e) => setText((t) => ({ ...t, requirements: e.target.value }))} onBlur={blurField("requirements")} />
          </Section>

          <Section title="Notes">
            <textarea className="dk-textarea" value={text.notes} placeholder="Anything worth remembering about this lead…" onChange={(e) => setText((t) => ({ ...t, notes: e.target.value }))} onBlur={blurField("notes")} />
          </Section>

          {lead.searchData && (
            <Section title="Everything they entered">
              <pre style={{ background: "var(--paper)", borderRadius: 8, padding: 12, fontSize: 12, overflowX: "auto", whiteSpace: "pre-wrap", margin: 0 }}>
                {JSON.stringify(lead.searchData, null, 2)}
              </pre>
            </Section>
          )}
        </div>

        {/* MIDDLE: Complete Activity Timeline */}
        <Section title="Complete activity timeline">
          <ActivityTimeline
            activities={activities}
            onAdd={async (type, note) => {
              const res = await api.post(`/leads/${id}/activities`, { type, note });
              setLead(res.lead);
              await loadActivities();
            }}
          />
        </Section>

        {/* RIGHT: Quick Actions */}
        <Section title="Quick actions">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a className="dk-btn" style={{ textAlign: "center", textDecoration: "none" }} href={lead.phone ? `tel:${lead.phone}` : undefined}
              onClick={(e) => { if (!lead.phone) { e.preventDefault(); return; } logQuick("called", "Called via quick action"); }}>
              📞 Call
            </a>
            <a className="dk-btn" style={{ textAlign: "center", textDecoration: "none", background: "#25D366" }}
              href={whatsappLeadLink({ leadName: lead.name, phone: lead.whatsapp || lead.phone })} target="_blank" rel="noreferrer"
              onClick={() => logQuick("whatsapp_sent", "Opened WhatsApp via quick action")}>
              💬 Open WhatsApp
            </a>

            <button className="dk-btn ghost" onClick={() => setScheduling((v) => !v)}>📅 Schedule Visit</button>
            {scheduling && (
              <InlineForm submitLabel="Confirm" onCancel={() => setScheduling(false)} onSubmit={confirmVisit}>
                <input className="dk-input" type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
              </InlineForm>
            )}

            <button className="dk-btn ghost" onClick={() => setQuoting((v) => !v)}>📄 Generate Quotation</button>
            {quoting && (
              <InlineForm submitLabel="Log" onCancel={() => setQuoting(false)} onSubmit={confirmQuote}>
                <input className="dk-input" type="number" placeholder="Amount (₹)" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} style={{ marginBottom: 6 }} />
                <input className="dk-input" placeholder="Note (optional)" value={quoteNote} onChange={(e) => setQuoteNote(e.target.value)} />
                <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 6 }}>Logs that a quotation was sent and updates expected revenue — doesn't generate a PDF.</div>
              </InlineForm>
            )}

            <div style={{ borderTop: "1px solid var(--line)", margin: "8px 0" }} />

            <button className="dk-btn" style={{ background: "var(--ok)" }} onClick={() => change("status", "won")}>✓ Mark Won</button>
            <button className="dk-btn ghost" style={{ color: "var(--bad)" }} onClick={() => { if (window.confirm("Mark this lead as lost?")) change("status", "lost"); }}>✕ Mark Lost</button>
          </div>
        </Section>
      </div>

      {/* Below: Upcoming Follow Ups / Upcoming Visits / Quotation History / Files */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 4 }}>
        <Section title="Upcoming follow ups">
          {lead.followUpAt && followUpUpcoming ? (
            <div className="dk-card" style={{ padding: 10, background: "#FBFAF6" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{formatDate(lead.followUpAt)}</div>
              <div style={{ fontSize: 11.5, color: "var(--mut)" }}>Next follow-up</div>
            </div>
          ) : <div style={{ fontSize: 12.5, color: "var(--mut)" }}>None scheduled.</div>}
          <Field label="Set next follow-up">
            <input className="dk-input" type="date" value={lead.followUpAt ? lead.followUpAt.slice(0, 10) : ""} onChange={(e) => change("followUpAt", e.target.value)} />
          </Field>
        </Section>

        <Section title="Upcoming visits">
          {lead.siteVisitAt && visitUpcoming ? (
            <div className="dk-card" style={{ padding: 10, background: "#FBFAF6" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{formatDate(lead.siteVisitAt)}</div>
              <div style={{ fontSize: 11.5, color: "var(--mut)" }}>Scheduled site visit</div>
            </div>
          ) : <div style={{ fontSize: 12.5, color: "var(--mut)" }}>None scheduled.</div>}
        </Section>

        <Section title="Quotation history">
          {quotationHistory.length === 0 && <div style={{ fontSize: 12.5, color: "var(--mut)" }}>No quotations logged yet.</div>}
          {quotationHistory.map((q) => (
            <div key={q.id} style={{ fontSize: 12.5, marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>{formatDate(q.createdAt)}</div>
              <div style={{ color: "var(--mut)" }}>{q.note || "Quotation sent"}</div>
            </div>
          ))}
        </Section>

        <Section title="Files">
          {files === null && <div style={{ fontSize: 12.5, color: "var(--mut)" }}>Loading…</div>}
          {files && files.length === 0 && <div style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 8 }}>No files yet.</div>}
          {files && files.map((f) => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, marginBottom: 6 }}>
              <a href={resolveMediaUrl(f.filePath)} target="_blank" rel="noreferrer" style={{ color: "var(--ink)", textDecoration: "underline", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.fileName || f.filePath}</a>
              <span style={{ cursor: "pointer", color: "var(--mut)" }} onClick={() => removeFile(f.id)}>✕</span>
            </div>
          ))}
          <input id="lead-file-input" type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={uploadFile} />
          <button className="dk-btn ghost" style={{ width: "100%", marginTop: 4 }} disabled={uploading} onClick={() => document.getElementById("lead-file-input").click()}>
            {uploading ? "Uploading…" : "+ Upload file"}
          </button>
        </Section>
      </div>
    </div>
  );
}
