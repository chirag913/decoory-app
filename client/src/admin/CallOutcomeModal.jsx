import { useState } from "react";
import { CALL_OUTCOMES, LOST_REASONS, TERMINAL_OUTCOME_KEYS } from "../shared/pipelineHelpers.js";

// The Call Outcome system (Rules 1-3, 8, and the terminal outcomes) — the
// only thing a salesperson records after a call is *what happened*; every
// stage move, follow-up date, attempt count and temperature change is
// computed server-side (POST /leads/:id/call-outcome) from that single
// choice, so it's always applied consistently. Shared by the Sales Pipeline
// Kanban and the Lead Detail page so both call the same rules.
export default function CallOutcomeModal({ lead, onClose, onSubmit }) {
  const [outcome, setOutcome] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Rule 2 / Rule 3
  const [when, setWhen] = useState("today");
  const [customDate, setCustomDate] = useState("");
  const [cbReason, setCbReason] = useState("");
  const [cbDate, setCbDate] = useState("");
  const [cbTime, setCbTime] = useState("");
  // Rule 4
  const [wantsVisit, setWantsVisit] = useState(null);
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [address, setAddress] = useState(lead.address || "");
  const [visitNotes, setVisitNotes] = useState("");
  // Rule 8
  const [lostReason, setLostReason] = useState("");
  const [followUp3Months, setFollowUp3Months] = useState(null);
  // Other
  const [note, setNote] = useState("");

  const submit = async (payload) => {
    setError("");
    setSaving(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err.message || "Could not save this outcome");
    } finally {
      setSaving(false);
    }
  };

  const pick = (key) => {
    if (TERMINAL_OUTCOME_KEYS.includes(key) || key === "no-response") {
      submit({ outcome: key });
    } else {
      setOutcome(key);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,20,16,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div className="dk-card" style={{ padding: 20, width: 420, maxWidth: "92vw", maxHeight: "86vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <div className="dk-eyebrow">Call Outcome</div>
            <div className="serif" style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>{lead.name}</div>
          </div>
          <span style={{ cursor: "pointer", color: "var(--mut)" }} onClick={onClose}>✕</span>
        </div>
        {lead.phone && <a href={`tel:${lead.phone}`} style={{ fontSize: 12.5, color: "var(--brass)", display: "inline-block", marginTop: 6 }}>📞 Dial {lead.phone}</a>}

        {!outcome && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 14 }}>
            {CALL_OUTCOMES.map((o) => (
              <button key={o.key} className="dk-btn ghost" style={{ fontSize: 12.5, padding: "8px 6px", textAlign: "left" }} disabled={saving} onClick={() => pick(o.key)}>
                {o.icon} {o.label}
              </button>
            ))}
          </div>
        )}

        {outcome === "busy" && (
          <div style={{ marginTop: 14 }}>
            <div className="dk-eyebrow" style={{ marginBottom: 8 }}>When should we call again?</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {["today", "tomorrow", "custom"].map((w) => (
                <button key={w} className={`dk-btn ${when === w ? "" : "ghost"}`} style={{ fontSize: 12, padding: "6px 10px", textTransform: "capitalize" }} onClick={() => setWhen(w)}>{w}</button>
              ))}
            </div>
            {when === "custom" && <input className="dk-input" type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />}
          </div>
        )}

        {outcome === "call-back-later" && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <input className="dk-input" placeholder="Reason (optional)" value={cbReason} onChange={(e) => setCbReason(e.target.value)} />
            <input className="dk-input" type="date" value={cbDate} onChange={(e) => setCbDate(e.target.value)} />
            <input className="dk-input" type="time" value={cbTime} onChange={(e) => setCbTime(e.target.value)} />
          </div>
        )}

        {outcome === "interested" && wantsVisit === null && (
          <div style={{ marginTop: 14 }}>
            <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Schedule a site visit?</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="dk-btn" style={{ fontSize: 12.5 }} onClick={() => setWantsVisit(true)}>Yes</button>
              <button className="dk-btn ghost" style={{ fontSize: 12.5 }} onClick={() => submit({ outcome: "interested" })} disabled={saving}>No, just interested</button>
            </div>
          </div>
        )}

        {(outcome === "site-visit-booked" || (outcome === "interested" && wantsVisit === true)) && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="dk-eyebrow">Visit details</div>
            <input className="dk-input" type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
            <input className="dk-input" type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} />
            <input className="dk-input" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
            <input className="dk-input" placeholder="Notes (optional)" value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)} />
          </div>
        )}

        {outcome === "not-interested" && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="dk-eyebrow">Why?</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {LOST_REASONS.map((r) => (
                <button key={r} className={`dk-btn ${lostReason === r ? "" : "ghost"}`} style={{ fontSize: 11.5, padding: "5px 9px" }} onClick={() => setLostReason(r)}>{r}</button>
              ))}
            </div>
            {lostReason && (
              <>
                <div className="dk-eyebrow" style={{ marginTop: 4 }}>Follow up again in 3 months?</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className={`dk-btn ${followUp3Months === true ? "" : "ghost"}`} style={{ fontSize: 12 }} onClick={() => setFollowUp3Months(true)}>Yes, snooze</button>
                  <button className={`dk-btn ${followUp3Months === false ? "" : "ghost"}`} style={{ fontSize: 12 }} onClick={() => setFollowUp3Months(false)}>No, close lead</button>
                </div>
              </>
            )}
          </div>
        )}

        {outcome === "other" && (
          <div style={{ marginTop: 14 }}>
            <textarea className="dk-textarea" placeholder="What happened?" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        )}

        {error && <div style={{ fontSize: 12, color: "var(--bad)", marginTop: 10 }}>{error}</div>}

        {outcome && (
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              className="dk-btn" disabled={saving
                || (outcome === "busy" && when === "custom" && !customDate)
                || (outcome === "call-back-later" && !cbDate)
                || ((outcome === "site-visit-booked" || (outcome === "interested" && wantsVisit)) && !visitDate)
                || (outcome === "not-interested" && (!lostReason || followUp3Months === null))
              }
              onClick={() => {
                if (outcome === "busy") submit({ outcome: "busy", when, customDate });
                else if (outcome === "call-back-later") submit({ outcome: "call-back-later", reason: cbReason, date: cbDate, time: cbTime });
                else if (outcome === "site-visit-booked" || (outcome === "interested" && wantsVisit)) submit({ outcome: "site-visit-booked", visitDate, visitTime, address, notes: visitNotes });
                else if (outcome === "not-interested") submit({ outcome: "not-interested", lostReason, followUp3Months });
                else if (outcome === "other") submit({ outcome: "other", note });
              }}
            >
              {saving ? "Saving…" : "Confirm"}
            </button>
            <button className="dk-btn ghost" onClick={() => { setOutcome(null); setWantsVisit(null); }}>Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
