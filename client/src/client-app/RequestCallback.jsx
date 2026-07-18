import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { SectionTitle } from "../shared/ui.jsx";
import { whatsappCallbackLink } from "../shared/contact.js";

// Callback slots: IST business hours 10 AM - 7 PM, hourly, with same-day
// requests needing a 2-hour lead time — see the matching validation in
// server/src/routes/projects.js's POST /:id/callback-request (server is
// the source of truth; this just keeps the client from offering a slot
// the server would reject).
function istNow() {
  return new Date(Date.now() + 5.5 * 3600000); // UTC getters below then read as IST wall-clock fields
}
function istDateStr(d) {
  return d.toISOString().slice(0, 10);
}
function slotsFor(dateStr) {
  const now = istNow();
  const isToday = dateStr === istDateStr(now);
  let startHour = 10;
  if (isToday) {
    const earliest = new Date(now.getTime() + 2 * 3600000);
    startHour = earliest.getUTCHours() + (earliest.getUTCMinutes() > 0 ? 1 : 0);
    startHour = Math.max(startHour, 10);
  }
  const slots = [];
  for (let h = startHour; h <= 18; h++) {
    const label = h === 12 ? "12:00 PM" : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
    slots.push({ hour: h, label });
  }
  return slots;
}

export default function RequestCallback({ project }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = istDateStr(istNow());
  const maxDate = istDateStr(new Date(istNow().getTime() + 14 * 86400000));
  const [date, setDate] = useState(today);
  const [selectedHour, setSelectedHour] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(null);

  const slots = useMemo(() => slotsFor(date), [date]);

  const submit = async () => {
    if (selectedHour == null) return;
    setSaving(true);
    setError("");
    try {
      const time = `${String(selectedHour).padStart(2, "0")}:00`;
      const { label } = await api.post(`/projects/${project.id}/callback-request`, { date, time });
      setConfirmed({ label });
    } catch (err) {
      setError(err.message || "Could not request a callback");
    } finally {
      setSaving(false);
    }
  };

  if (confirmed) {
    return (
      <div>
        <button className="ca-btn ghost" style={{ padding: "6px 10px", marginBottom: 14 }} onClick={() => navigate(-1)}>← Back</button>
        <div className="ca-card" style={{ padding: 18, textAlign: "center" }}>
          <div style={{ fontSize: 32 }}>✅</div>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>Callback requested</div>
          <div style={{ fontSize: 13, color: "var(--mut)", marginTop: 6 }}>We'll call you on <b>{confirmed.label}</b>. Your team has been notified in-app.</div>
          <a
            className="ca-btn" style={{ marginTop: 16, background: "#25D366", textDecoration: "none", display: "block" }}
            href={whatsappCallbackLink({ clientName: user.name, projectName: project.name, projectCode: project.code, label: confirmed.label })}
            target="_blank" rel="noreferrer"
          >
            💬 Also notify us on WhatsApp
          </a>
          <button className="ca-btn ghost" style={{ marginTop: 10 }} onClick={() => navigate(-1)}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button className="ca-btn ghost" style={{ padding: "6px 10px", marginBottom: 14 }} onClick={() => navigate(-1)}>← Back</button>
      <SectionTitle eyebrow="Talk to your team" title="Request a Callback" />
      <div style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 14 }}>
        Pick a time that works for you — your sales consultant or project manager will call you then. Available 10 AM – 7 PM, at least 2 hours from now.
      </div>

      <label className="ca-label">Date</label>
      <input
        className="ca-input" type="date" value={date} min={today} max={maxDate}
        onChange={(e) => { setDate(e.target.value); setSelectedHour(null); }}
      />

      <label className="ca-label">Time</label>
      {slots.length === 0 ? (
        <div className="ca-card" style={{ padding: 14, fontSize: 12.5, color: "var(--mut)" }}>No slots left today — please pick another date.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {slots.map((s) => (
            <button
              key={s.hour}
              className={`ca-btn ${selectedHour === s.hour ? "" : "ghost"}`}
              style={{ padding: "10px 4px", fontSize: 12.5 }}
              onClick={() => setSelectedHour(s.hour)}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: "var(--bad)", marginTop: 10 }}>{error}</div>}

      <button className="ca-btn" style={{ marginTop: 18 }} disabled={selectedHour == null || saving} onClick={submit}>
        {saving ? "Requesting…" : "Request Callback"}
      </button>
    </div>
  );
}
