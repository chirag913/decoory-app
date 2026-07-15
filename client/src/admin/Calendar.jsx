import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Spinner } from "../shared/ui.jsx";
import { CALENDAR_EVENT_TYPES, CALENDAR_EVENT_META, MANUAL_CALENDAR_TYPES } from "../shared/calendarEvents.js";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear(), month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function AddEventForm({ leads, projects, onAdded, onClose }) {
  const [type, setType] = useState(MANUAL_CALENDAR_TYPES[0].key);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [notes, setNotes] = useState("");
  const [linkKind, setLinkKind] = useState("lead");
  const [leadId, setLeadId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setError("");
    if (!title.trim() || !eventDate) { setError("Title and date are required."); return; }
    const link = linkKind === "lead" ? { leadId: leadId || null, projectId: null } : { leadId: null, projectId: projectId || null };
    if (!link.leadId && !link.projectId) { setError(`Choose a ${linkKind === "lead" ? "lead" : "project"} to link this event to.`); return; }
    setSaving(true);
    try {
      await api.post("/calendar", { type, title: title.trim(), eventDate, notes: notes.trim() || null, ...link });
      onAdded();
      onClose();
    } catch (err) {
      setError(err.message || "Could not create event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dk-card" style={{ padding: 16, marginBottom: 16, background: "#FBFAF6" }}>
      <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Add calendar event</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select className="dk-select" style={{ width: 190 }} value={type} onChange={(e) => setType(e.target.value)}>
          {MANUAL_CALENDAR_TYPES.map((t) => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
        </select>
        <input className="dk-input" style={{ width: 220 }} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="dk-input" style={{ width: 160 }} type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select className="dk-select" style={{ width: 120 }} value={linkKind} onChange={(e) => { setLinkKind(e.target.value); setLeadId(""); setProjectId(""); }}>
          <option value="lead">Link: Lead</option>
          <option value="project">Link: Project</option>
        </select>
        {linkKind === "lead" ? (
          <select className="dk-select" style={{ width: 240 }} value={leadId} onChange={(e) => setLeadId(e.target.value)}>
            <option value="">— choose a lead —</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.leadCode} · {l.name}</option>)}
          </select>
        ) : (
          <select className="dk-select" style={{ width: 240 }} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">— choose a project —</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
          </select>
        )}
      </div>
      <input className="dk-input" style={{ width: "100%", marginTop: 8 }} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error && <div style={{ fontSize: 12.5, color: "var(--bad)", marginTop: 8 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="dk-btn" disabled={saving} onClick={save}>{saving ? "Saving…" : "Add event"}</button>
        <button className="dk-btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

export default function Calendar() {
  const navigate = useNavigate();
  const [events, setEvents] = useState(null);
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [monthDate, setMonthDate] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [adding, setAdding] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  const load = () => api.get("/calendar").then(({ events }) => setEvents(events));
  useEffect(() => {
    load();
    api.get("/leads").then(({ leads }) => setLeads(leads));
    api.get("/projects").then(({ projects }) => setProjects(projects));
  }, []);

  const removeEvent = async (ev, e) => {
    e.stopPropagation();
    if (!window.confirm(`Remove "${ev.title}" from the calendar?`)) return;
    await api.del(`/calendar/${ev.id}`);
    load();
  };

  const openEvent = (ev) => {
    if (ev.leadId) navigate(`/admin/leads/${ev.leadId}`);
    else if (ev.projectId) navigate(`/admin/projects/${ev.projectId}`);
  };

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const e of events || []) {
      const key = (e.eventDate || "").slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [events]);

  if (!events) return <Spinner />;

  const days = buildMonthGrid(monthDate);
  const monthLabel = monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const todayKey = toDateKey(new Date());
  const selectedEvents = selectedDay ? (eventsByDate[selectedDay] || []) : [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 600 }}>Calendar</h1>
          <div style={{ fontSize: 13, color: "var(--mut)", marginTop: 2 }}>Site visits, follow ups, installations, deliveries, meetings and quotation deadlines — company-wide.</div>
        </div>
        <button className="dk-btn" onClick={() => setAdding((v) => !v)}>+ Add event</button>
      </div>

      {adding && <div style={{ marginTop: 16 }}><AddEventForm leads={leads} projects={projects} onAdded={load} onClose={() => setAdding(false)} /></div>}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 16 }}>
        {CALENDAR_EVENT_TYPES.map((t) => (
          <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--mut)" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: t.color, display: "inline-block" }} />
            {t.label}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="dk-btn ghost" style={{ padding: "6px 12px" }} onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>←</button>
          <button className="dk-btn ghost" style={{ padding: "6px 12px" }} onClick={() => { const d = new Date(); d.setDate(1); setMonthDate(d); }}>Today</button>
          <button className="dk-btn ghost" style={{ padding: "6px 12px" }} onClick={() => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>→</button>
        </div>
        <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>{monthLabel}</div>
        <div style={{ width: 130 }} />
      </div>

      <div className="dk-card" style={{ marginTop: 12, padding: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {WEEKDAYS.map((w) => (
            <div key={w} style={{ fontSize: 11, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", padding: "4px 6px" }}>{w}</div>
          ))}
          {days.map((d) => {
            const key = toDateKey(d);
            const dayEvents = eventsByDate[key] || [];
            const inMonth = d.getMonth() === monthDate.getMonth();
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                onClick={() => setSelectedDay(key)}
                style={{
                  minHeight: 96, borderRadius: 8, padding: 6, cursor: "pointer",
                  background: selectedDay === key ? "var(--brass-soft)" : inMonth ? "var(--card)" : "#FAFAF7",
                  border: isToday ? "1.5px solid var(--brass)" : "1px solid var(--line)",
                  opacity: inMonth ? 1 : 0.5,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: isToday ? 800 : 600, color: isToday ? "var(--brass)" : "var(--ink)" }}>{d.getDate()}</div>
                <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                  {dayEvents.slice(0, 3).map((ev) => {
                    const meta = CALENDAR_EVENT_META[ev.type];
                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); openEvent(ev); }}
                        title={ev.title}
                        style={{
                          fontSize: 10.5, padding: "2px 5px", borderRadius: 4, color: "#fff",
                          background: meta.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                      >
                        {meta.icon} {ev.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && <div style={{ fontSize: 10, color: "var(--mut)" }}>+{dayEvents.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="dk-card" style={{ marginTop: 16, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="dk-eyebrow">{new Date(selectedDay + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
            <span style={{ fontSize: 12, color: "var(--mut)", cursor: "pointer" }} onClick={() => setSelectedDay(null)}>✕ Close</span>
          </div>
          {selectedEvents.length === 0 && <div style={{ fontSize: 13, color: "var(--mut)", marginTop: 10 }}>No events this day.</div>}
          {selectedEvents.map((ev) => {
            const meta = CALENDAR_EVENT_META[ev.type];
            const manual = MANUAL_CALENDAR_TYPES.some((t) => t.key === ev.type);
            return (
              <div key={ev.id} className="dk-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10, padding: "10px 4px", borderBottom: "1px solid var(--line)", cursor: "pointer" }} onClick={() => openEvent(ev)}>
                <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: meta.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{meta.icon}</span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{ev.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 2 }}>
                      {meta.label} · {ev.leadName ? `Lead: ${ev.leadName}` : ev.projectName ? `Project: ${ev.projectName}` : ""}
                    </div>
                    {ev.notes && <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>{ev.notes}</div>}
                  </div>
                </div>
                {manual && <span style={{ fontSize: 11.5, color: "var(--bad)", flexShrink: 0 }} onClick={(e) => removeEvent(ev, e)}>Remove</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
