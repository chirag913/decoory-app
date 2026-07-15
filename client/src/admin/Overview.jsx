import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { formatINR, greeting, istToday } from "../shared/format.js";
import { Spinner } from "../shared/ui.jsx";

function Stat({ label, value, sub }) {
  return (
    <div className="dk-card" style={{ padding: "16px 18px", flex: 1, minWidth: 150 }}>
      <div className="dk-eyebrow">{label}</div>
      <div className="serif" style={{ fontSize: 30, fontWeight: 600, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

const PRIORITY_COLOR = { bad: "var(--bad)", warn: "var(--warn)", ok: "var(--ok)" };

// A row in "Today's Actions" — a colored left bar signals urgency (red =
// overdue/urgent, amber = due but on schedule, green = nothing pending).
function ActionRow({ icon, label, count, detail, priority, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        borderLeft: `3px solid ${PRIORITY_COLOR[priority]}`, padding: "12px 14px",
        background: "#FAF8F2", borderRadius: "0 8px 8px 0", marginBottom: 10,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <span style={{ fontSize: 19, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail}</div>
      </div>
      <div className="serif" style={{ fontSize: 21, fontWeight: 600, color: PRIORITY_COLOR[priority], flexShrink: 0 }}>{count}</div>
    </div>
  );
}

export default function Overview() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/projects"),
      api.get("/payments"),
      api.get("/leads"),
      api.get("/reports/summary"),
    ]).then(([p, pay, l, r]) => setData({ projects: p.projects, payments: pay.payments, leads: l.leads, reports: r }));
  }, []);

  if (!data) return <Spinner />;
  const { projects, payments, leads, reports } = data;
  const snapshot = reports.businessSnapshot;

  const today = istToday();
  const dateOf = (iso) => (iso ? iso.slice(0, 10) : null);

  const newLeadsToday = leads.filter((l) => dateOf(l.createdAt) === today);
  const needFirstCall = leads.filter((l) => l.status === "new-lead");
  const oldestNewLeadHours = needFirstCall.length
    ? Math.max(...needFirstCall.map((l) => (Date.now() - new Date(l.createdAt).getTime()) / 3600000))
    : 0;

  const followUpsDue = leads.filter((l) => l.followUpAt && dateOf(l.followUpAt) <= today);
  const followUpsOverdue = followUpsDue.filter((l) => dateOf(l.followUpAt) < today);

  const siteVisitsToday = leads.filter((l) => l.siteVisitAt && dateOf(l.siteVisitAt) === today);

  const quotesPending = leads.filter((l) => l.status === "quotation-pending");

  const overduePayments = payments.filter((p) => p.status === "overdue");
  const upcomingPayments = payments.filter((p) => p.status === "upcoming");
  const paymentsToCollect = [...overduePayments, ...upcomingPayments];
  const paymentsToCollectPaise = paymentsToCollect.reduce((s, p) => s + p.amountPaise, 0);

  const runningProjects = projects.filter((p) => !p.completedAt);
  const runningOnTrack = runningProjects.filter((p) => p.health === "on-track").length;
  const runningAttention = runningProjects.filter((p) => p.health === "attention").length;

  return (
    <div>
      <div className="dk-eyebrow">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div>
      <h1 className="serif" style={{ fontSize: 28, fontWeight: 600, margin: "4px 0 20px" }}>{greeting()}, Decoory team</h1>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Stat label="New leads today" value={newLeadsToday.length} sub={`${needFirstCall.length} awaiting first call`} />
        <Stat label="Follow ups due today" value={followUpsDue.length} sub={followUpsOverdue.length > 0 ? `${followUpsOverdue.length} overdue` : "On schedule"} />
        <Stat label="Site visits today" value={siteVisitsToday.length} sub={siteVisitsToday.length ? siteVisitsToday.map((l) => l.name).join(" · ") : "None scheduled"} />
        <Stat label="Running projects" value={runningProjects.length} sub={`${runningOnTrack} on track · ${runningAttention} needs attention`} />
      </div>

      <div className="dk-card" style={{ padding: 20, marginTop: 20 }}>
        <div className="dk-eyebrow">Today's Actions</div>
        <div className="serif" style={{ fontSize: 18, fontWeight: 600, margin: "2px 0 14px" }}>What needs doing right now</div>

        <ActionRow
          icon="🔥" label="New leads needing first call"
          count={needFirstCall.length}
          detail={needFirstCall.length ? needFirstCall.slice(0, 3).map((l) => l.name).join(" · ") : "Nothing waiting"}
          priority={needFirstCall.length === 0 ? "ok" : oldestNewLeadHours > 24 ? "bad" : "warn"}
          onClick={() => navigate("sales-pipeline")}
        />
        <ActionRow
          icon="📞" label="Follow ups due"
          count={followUpsDue.length}
          detail={followUpsDue.length ? followUpsDue.slice(0, 3).map((l) => l.name).join(" · ") : "Nothing due"}
          priority={followUpsDue.length === 0 ? "ok" : followUpsOverdue.length > 0 ? "bad" : "warn"}
          onClick={() => navigate("sales-pipeline")}
        />
        <ActionRow
          icon="📅" label="Site visits today"
          count={siteVisitsToday.length}
          detail={siteVisitsToday.length ? siteVisitsToday.slice(0, 3).map((l) => l.name).join(" · ") : "None scheduled"}
          priority={siteVisitsToday.length === 0 ? "ok" : "warn"}
          onClick={() => navigate("sales-pipeline")}
        />
        <ActionRow
          icon="📄" label="Quotations pending"
          count={quotesPending.length}
          detail={quotesPending.length ? quotesPending.slice(0, 3).map((l) => l.name).join(" · ") : "Nothing pending"}
          priority={quotesPending.length === 0 ? "ok" : "warn"}
          onClick={() => navigate("sales-pipeline")}
        />
        <ActionRow
          icon="💰" label="Payments to collect"
          count={paymentsToCollect.length}
          detail={paymentsToCollect.length ? `${formatINR(paymentsToCollectPaise)} · ${overduePayments.length} overdue` : "All collected"}
          priority={paymentsToCollect.length === 0 ? "ok" : overduePayments.length > 0 ? "bad" : "warn"}
          onClick={() => navigate("payments")}
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="dk-eyebrow">Business Snapshot</div>
        <div className="serif" style={{ fontSize: 18, fontWeight: 600, margin: "2px 0 12px" }}>How the business is doing</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <Stat label="Monthly revenue" value={formatINR(snapshot.monthlyRevenuePaise)} sub="Collected this month" />
          <Stat label="Lead conversion" value={`${snapshot.leadConversionPct}%`} sub="Advance received ÷ total leads" />
          <Stat label="Avg. project value" value={formatINR(snapshot.avgProjectValuePaise)} sub={`Across ${projects.length} project${projects.length === 1 ? "" : "s"}`} />
          <Stat label="Completed this month" value={snapshot.projectsCompletedThisMonth} sub="Projects handed over" />
          <Stat label="Google reviews" value="—" sub="Connect Google Business Profile" />
          <Stat label="Customer satisfaction" value="—" sub="No survey data yet" />
        </div>
      </div>

      <div className="dk-card" style={{ padding: 20, marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div className="dk-eyebrow">Morning brief</div>
            <div className="serif" style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>Today at your sites</div>
          </div>
          <span style={{ fontSize: 11, color: "var(--mut)" }}>Sent 8:00 AM as in-app notification</span>
        </div>
        {projects.filter((p) => p.todayPlan).map((p) => (
          <div key={p.id} style={{ borderTop: "1px solid var(--line)", marginTop: 14, paddingTop: 14, cursor: "pointer" }} onClick={() => navigate(`projects/${p.id}`)}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.name}</div>
            <div style={{ fontSize: 13, marginTop: 3 }}>{p.todayPlan}</div>
            {p.todayTeam && <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 3 }}>Team: {p.todayTeam}</div>}
          </div>
        ))}
        {projects.filter((p) => !p.todayPlan).length > 0 && (
          <div style={{ borderTop: "1px solid var(--line)", marginTop: 14, paddingTop: 14, fontSize: 12.5, color: "var(--mut)" }}>
            {projects.filter((p) => !p.todayPlan).map((p) => p.name).join(", ")} — today's plan not set yet.
          </div>
        )}
      </div>
    </div>
  );
}
