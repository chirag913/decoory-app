import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Spinner } from "../shared/ui.jsx";
import { CALENDAR_EVENT_TYPES, CALENDAR_EVENT_META } from "../shared/calendarEvents.js";
import { DAY_ACTIVITY_TYPES, summarizeDayActivities } from "../shared/pipelineHelpers.js";
import { ACTIVITY_META } from "../shared/leadStages.js";

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

export default function Calendar() {
  const navigate = useNavigate();
  const [events, setEvents] = useState(null);
  const [activities, setActivities] = useState([]);
  const [monthDate, setMonthDate] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDay, setSelectedDay] = useState(null);

  const load = () => api.get("/calendar").then((res) => { setEvents(res.events); setActivities(res.activities || []); });
  useEffect(() => { load(); }, []);

  const openLead = (leadId) => navigate(`/admin/leads/${leadId}`);

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const e of events || []) {
      const key = (e.eventDate || "").slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [events]);

  const dayActivity = useMemo(() => summarizeDayActivities(activities), [activities]);

  if (!events) return <Spinner />;

  const days = buildMonthGrid(monthDate);
  const monthLabel = monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const todayKey = toDateKey(new Date());
  const selectedEvents = selectedDay ? (eventsByDate[selectedDay] || []) : [];
  const selectedActivity = selectedDay ? dayActivity[selectedDay] : null;

  return (
    <div>
      <div>
        <h1 className="serif" style={{ fontSize: 26, fontWeight: 600 }}>Calendar</h1>
        <div style={{ fontSize: 13, color: "var(--mut)", marginTop: 2 }}>What the Sales Pipeline did each day — new leads, closed, visits scheduled, quotations sent — plus upcoming site visits and follow-ups.</div>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 16 }}>
        {CALENDAR_EVENT_TYPES.map((t) => (
          <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--mut)" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: t.color, display: "inline-block" }} />
            {t.label}
          </div>
        ))}
        {DAY_ACTIVITY_TYPES.map((t) => (
          <div key={t.key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--mut)" }}>
            <span>{t.icon}</span>
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
            const counts = dayActivity[key]?.counts;
            const inMonth = d.getMonth() === monthDate.getMonth();
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                onClick={() => setSelectedDay(key)}
                style={{
                  minHeight: 100, borderRadius: 8, padding: 6, cursor: "pointer",
                  background: selectedDay === key ? "var(--brass-soft)" : inMonth ? "var(--card)" : "#FAFAF7",
                  border: isToday ? "1.5px solid var(--brass)" : "1px solid var(--line)",
                  opacity: inMonth ? 1 : 0.5,
                }}
              >
                <div style={{ fontSize: 11.5, fontWeight: isToday ? 800 : 600, color: isToday ? "var(--brass)" : "var(--ink)" }}>{d.getDate()}</div>
                <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                  {dayEvents.slice(0, 2).map((ev) => {
                    const meta = CALENDAR_EVENT_META[ev.type];
                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); openLead(ev.leadId); }}
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
                  {dayEvents.length > 2 && <div style={{ fontSize: 10, color: "var(--mut)" }}>+{dayEvents.length - 2} more</div>}
                </div>
                {counts && (
                  <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {DAY_ACTIVITY_TYPES.filter((t) => counts[t.key] > 0).map((t) => (
                      <span key={t.key} title={t.label} style={{ fontSize: 10, padding: "1px 4px", borderRadius: 4, background: t.bg, color: t.fg, fontWeight: 700 }}>
                        {t.icon}{counts[t.key]}
                      </span>
                    ))}
                  </div>
                )}
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

          {selectedEvents.length === 0 && (!selectedActivity || selectedActivity.items.length === 0) && (
            <div style={{ fontSize: 13, color: "var(--mut)", marginTop: 10 }}>Nothing happened this day.</div>
          )}

          {selectedEvents.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", marginBottom: 4 }}>Scheduled</div>
              {selectedEvents.map((ev) => {
                const meta = CALENDAR_EVENT_META[ev.type];
                return (
                  <div key={ev.id} className="dk-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: "1px solid var(--line)", cursor: "pointer" }} onClick={() => openLead(ev.leadId)}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: meta.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{meta.icon}</span>
                    <div style={{ fontSize: 13 }}>{ev.title}</div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedActivity && selectedActivity.items.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--mut)", textTransform: "uppercase", marginBottom: 4 }}>Pipeline activity</div>
              {selectedActivity.items.map((a) => {
                const meta = ACTIVITY_META[a.type] || ACTIVITY_META.other;
                return (
                  <div key={a.id} className="dk-row" style={{ display: "flex", alignItems: "start", gap: 10, padding: "8px 4px", borderBottom: "1px solid var(--line)", cursor: "pointer" }} onClick={() => openLead(a.leadId)}>
                    <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--brass-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{meta.icon}</span>
                    <div>
                      <div style={{ fontSize: 13 }}><b>{a.leadName}</b> — {meta.label}</div>
                      {a.note && <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 1 }}>{a.note}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
