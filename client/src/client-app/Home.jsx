import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatINR, formatDate, daysUntil, greeting, greetingEmoji } from "../shared/format.js";
import { Bar, Photo } from "../shared/ui.jsx";

export default function Home({ project, onProjectChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [latestUpdate, setLatestUpdate] = useState(null);
  const [duePayment, setDuePayment] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ updates }, { payments }, { suggestions }, { notifications }] = await Promise.all([
        api.get(`/projects/${project.id}/updates`),
        api.get(`/projects/${project.id}/payments`),
        api.get(`/projects/${project.id}/suggestions`),
        api.get("/notifications"),
      ]);
      if (cancelled) return;
      setLatestUpdate(updates[0] || null);
      setDuePayment(payments.find((p) => p.status === "upcoming" || p.status === "overdue") || null);
      setSuggestion(suggestions.find((s) => s.status === "sent") || null);
      setHasUnreadChat(notifications.some((n) => n.type === "chat" && !n.read));
    })();
    return () => { cancelled = true; };
  }, [project.id]);

  const respondSuggestion = async (status) => {
    if (!suggestion) return;
    await api.patch(`/suggestions/${suggestion.id}`, { status });
    setSuggestion(null);
  };

  const daysLeft = daysUntil(project.handoverDate);
  const greetName = (user.name || "").split(" ")[0];
  const greetEmoji = greetingEmoji();
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div className="ca-eyebrow">{today}</div>
          <div className="serif" style={{ fontSize: 23, fontWeight: 600 }}>{greeting()}, {greetName} {greetEmoji}</div>
        </div>
        <span onClick={() => navigate("chat")} style={{ position: "relative", cursor: "pointer", fontSize: 20 }}>
          💬{hasUnreadChat && <span style={{ position: "absolute", top: -3, right: -5, width: 9, height: 9, background: "var(--bad)", borderRadius: "50%" }} />}
        </span>
      </div>

      <div className="ca-card" style={{ padding: 16, background: "var(--ink)", color: "#EDEAE0", border: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 11, color: "#9A968A", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700 }}>{project.name} · {project.code}</div>
            <div className="serif" style={{ fontSize: 30, fontWeight: 600, marginTop: 4 }}>
              {project.progressPct}%<span style={{ fontSize: 13, fontWeight: 400, color: "#9A968A" }}> complete</span>
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 11.5, color: "#C9C5B6" }}>
            Handover<br /><b style={{ color: "#fff", fontSize: 13 }}>{formatDate(project.handoverDate)}</b>
            <br />{daysLeft != null && daysLeft >= 0 ? `${daysLeft} days to go` : ""}
          </div>
        </div>
        <div style={{ margin: "12px 0 6px" }}><Bar v={project.progressPct} /></div>
        <div style={{ fontSize: 12, color: "#C9C5B6" }}>Current stage: {project.currentStage}</div>
      </div>

      {project.todayPlan && (
        <div className="ca-card" style={{ padding: 14, marginTop: 12, borderLeft: "3px solid var(--brass)" }}>
          <span className="ca-eyebrow">Today at your site</span>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 6 }}>{project.todayPlan}</div>
          {project.todayTeam && <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 4 }}>Team: {project.todayTeam}</div>}
        </div>
      )}

      {latestUpdate && (
        <div className="ca-card" style={{ padding: 14, marginTop: 12, cursor: "pointer" }} onClick={() => navigate("updates")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="ca-eyebrow">Latest site update</span>
            <span style={{ fontSize: 12, color: "var(--brass)", fontWeight: 700 }}>View all →</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {latestUpdate.media.slice(0, 3).map((m) => <Photo key={m.id} media={m} />)}
          </div>
          <div style={{ fontSize: 12.5, marginTop: 8, color: "var(--mut)" }}>
            {latestUpdate.items[0]}{latestUpdate.items.length > 1 ? ` · +${latestUpdate.items.length - 1} more` : ""}
          </div>
        </div>
      )}

      {duePayment && (
        <div className="ca-card" style={{ padding: 14, marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{duePayment.label}</div>
              <div style={{ fontSize: 12, color: "var(--mut)" }}>{formatINR(duePayment.amountPaise)} · due {formatDate(duePayment.dueAt)}</div>
            </div>
            <button className="ca-btn" style={{ width: "auto", padding: "9px 18px" }} onClick={() => navigate("payments")}>Pay now</button>
          </div>
        </div>
      )}

      {suggestion && (
        <div className="ca-card" style={{ padding: 14, marginTop: 12, background: "var(--brass-soft)", border: "none" }}>
          <div className="ca-eyebrow" style={{ color: "#8A6A28" }}>Idea for your home</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 4 }}>{suggestion.title}</div>
          <div style={{ fontSize: 12.5, color: "#5C4E30", marginTop: 3 }}>
            {suggestion.description}{suggestion.priceNote ? ` — ${suggestion.priceNote}` : ""}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="ca-btn ghost" style={{ background: "#fff" }} onClick={() => respondSuggestion("interested")}>I'm interested</button>
            <button className="ca-btn ghost" style={{ border: "none" }} onClick={() => respondSuggestion("dismissed")}>Maybe later</button>
          </div>
        </div>
      )}
      <div style={{ height: 10 }} />
    </div>
  );
}
