import { useState } from "react";

/* ── Decoory Interior's — Admin Dashboard Prototype ──
   Palette: ink-green sidebar, warm paper canvas, brass accent
   (brass = the hardware Decoory installs: Hafele / Hettich)   */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Archivo:wght@400;500;600;700&display=swap');
:root{
  --ink:#1E2622; --ink2:#2A342E; --paper:#F4F2EC; --card:#FFFFFF;
  --brass:#A8823C; --brass-soft:#F0E7D2; --line:#E3DFD4;
  --ok:#3E7A5B; --warn:#C4841D; --bad:#B3452E; --mut:#6E6A5E;
}
.dk-root{font-family:'Archivo',system-ui,sans-serif;background:var(--paper);color:var(--ink);min-height:100vh;display:flex}
.dk-serif{font-family:'Fraunces',Georgia,serif}
.dk-side{background:var(--ink);color:#EDEAE0;width:216px;flex-shrink:0;display:flex;flex-direction:column;padding:20px 12px}
.dk-nav{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:9px 12px;border-radius:8px;font-size:13.5px;font-weight:500;color:#C9C5B6;border:none;background:transparent;cursor:pointer}
.dk-nav:hover{background:var(--ink2);color:#fff}
.dk-nav.on{background:var(--ink2);color:#fff;box-shadow:inset 3px 0 0 var(--brass)}
.dk-main{flex:1;padding:26px 30px;overflow-y:auto;max-height:100vh}
.dk-card{background:var(--card);border:1px solid var(--line);border-radius:12px}
.dk-chip{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 9px;border-radius:99px;letter-spacing:.02em}
.dk-btn{background:var(--ink);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
.dk-btn:hover{background:var(--ink2)}
.dk-btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
.dk-btn.ghost:hover{background:var(--brass-soft)}
.dk-eyebrow{font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--brass)}
.dk-tab{border:none;background:transparent;padding:8px 2px;margin-right:20px;font-size:13px;font-weight:600;color:var(--mut);cursor:pointer;border-bottom:2px solid transparent;font-family:inherit}
.dk-tab.on{color:var(--ink);border-bottom-color:var(--brass)}
.dk-row:hover{background:#FAF8F2}
.dk-swatch{width:14px;height:14px;border-radius:3px;border:1px solid rgba(0,0,0,.12)}
@media (max-width:760px){.dk-side{width:60px}.dk-side .lbl{display:none}.dk-main{padding:16px}}
`;

/* ── Mock data ── */
const MATERIAL_COLORS = {
  "Century Ply": "#8A5A33", "Action TESA": "#B98A54", "Hafele": "#9BA1A6",
  "Hettich": "#5E6B73", "Virgo": "#C9B18C", "Kwalit": "#4C4A45",
};

const PROJECTS = [
  {
    id: "DCR-101", name: "Sharma Residence", type: "3BHK · Sector 62, Noida",
    client: "Rakesh Sharma", budget: "₹18.5L", paid: "₹11.2L", progress: 62,
    stage: "Modular kitchen install", due: "28 Aug 2026", health: "on-track",
    materials: ["Century Ply", "Hafele", "Virgo"],
    updates: [
      { date: "10 Jul 2026", items: ["Modular kitchen lower cabinets completed", "Electrical wiring 80% complete", "Chimney duct routing marked"], photos: 6 },
      { date: "09 Jul 2026", items: ["Kitchen carcass assembly", "False ceiling POP finished in living room"], photos: 4 },
      { date: "08 Jul 2026", items: ["Site material delivery — Century Ply BWP 12 sheets", "Wardrobe frame work started"], photos: 5 },
      { date: "07 Jul 2026", items: ["Electrical conduit work in bedrooms", "Kitchen granite template measured"], photos: 3 },
    ],
    payments: [
      { label: "Booking advance (10%)", amount: "₹1.85L", due: "02 May 2026", status: "paid" },
      { label: "Design freeze (20%)", amount: "₹3.70L", due: "24 May 2026", status: "paid" },
      { label: "Material dispatch (30%)", amount: "₹5.55L", due: "18 Jun 2026", status: "paid" },
      { label: "Kitchen install (25%)", amount: "₹4.65L", due: "14 Jul 2026", status: "upcoming", reminder: "13 Jul, 6:00 PM — in-app" },
      { label: "Handover (15%)", amount: "₹2.75L", due: "26 Aug 2026", status: "scheduled" },
    ],
    team: [
      { name: "Mahesh Yadav", role: "Site supervisor", phone: "+91 98••• ••210" },
      { name: "Sunil Vishwakarma", role: "Head carpenter", phone: "+91 87••• ••934" },
      { name: "Arif Khan", role: "Electrician", phone: "+91 99••• ••112" },
      { name: "Deepak Rana", role: "Painter", phone: "+91 96••• ••870" },
    ],
  },
  {
    id: "DCR-102", name: "Verma Villa", type: "Duplex · Greater Noida West",
    client: "Anita Verma", budget: "₹32.0L", paid: "₹9.6L", progress: 34,
    stage: "Electrical & ceiling", due: "20 Oct 2026", health: "attention",
    materials: ["Action TESA", "Hettich", "Century Ply"],
    updates: [
      { date: "10 Jul 2026", items: ["False ceiling framing — first floor", "AC copper piping routed"], photos: 5 },
      { date: "09 Jul 2026", items: ["Electrical wiring ground floor 60%"], photos: 2 },
    ],
    payments: [
      { label: "Booking advance (10%)", amount: "₹3.20L", due: "05 Jun 2026", status: "paid" },
      { label: "Design freeze (20%)", amount: "₹6.40L", due: "30 Jun 2026", status: "overdue", reminder: "Daily 10:00 AM — in-app" },
      { label: "Material dispatch (30%)", amount: "₹9.60L", due: "08 Aug 2026", status: "scheduled" },
    ],
    team: [
      { name: "Ravi Bisht", role: "Site supervisor", phone: "+91 98••• ••441" },
      { name: "Imran Saifi", role: "Electrician", phone: "+91 97••• ••306" },
    ],
  },
  {
    id: "DCR-103", name: "Kapoor Apartment", type: "2BHK · Indirapuram, Ghaziabad",
    client: "Neha Kapoor", budget: "₹9.8L", paid: "₹8.8L", progress: 88,
    stage: "Painting & finishing", due: "24 Jul 2026", health: "on-track",
    materials: ["Century Ply", "Kwalit"],
    updates: [
      { date: "10 Jul 2026", items: ["Second coat — bedrooms done", "Wardrobe shutters aligned & hardware fitted"], photos: 7 },
      { date: "09 Jul 2026", items: ["Primer coat complete", "Deep cleaning scheduled for 20 Jul"], photos: 3 },
    ],
    payments: [
      { label: "Booking advance (10%)", amount: "₹0.98L", due: "10 Mar 2026", status: "paid" },
      { label: "Design freeze (20%)", amount: "₹1.96L", due: "02 Apr 2026", status: "paid" },
      { label: "Material dispatch (40%)", amount: "₹3.92L", due: "05 May 2026", status: "paid" },
      { label: "Install milestone (20%)", amount: "₹1.96L", due: "20 Jun 2026", status: "paid" },
      { label: "Handover (10%)", amount: "₹0.98L", due: "22 Jul 2026", status: "upcoming", reminder: "22 Jul, 9:00 AM — in-app" },
    ],
    team: [
      { name: "Mahesh Yadav", role: "Site supervisor", phone: "+91 98••• ••210" },
      { name: "Deepak Rana", role: "Painter", phone: "+91 96••• ••870" },
    ],
  },
];

const LEADS = [
  { name: "Vivek Malhotra", city: "Noida", room: "Living room", budget: "₹8.0L", est: "₹7.4L – ₹8.6L", src: "Self-estimation tool", when: "Today, 9:42 AM", status: "new" },
  { name: "Priya Nair", city: "Gurugram", room: "Full 3BHK", budget: "₹22L", est: "₹19L – ₹24L", src: "Self-estimation tool", when: "Today, 8:10 AM", status: "new" },
  { name: "Harshit Jain", city: "Ghaziabad", room: "Modular kitchen", budget: "₹4.5L", est: "₹3.9L – ₹4.8L", src: "Design upload", when: "Yesterday", status: "contacted" },
  { name: "Sana Qureshi", city: "Delhi", room: "Master bedroom", budget: "₹3.2L", est: "₹2.8L – ₹3.5L", src: "Self-estimation tool", when: "08 Jul", status: "qualified" },
  { name: "Rohit Bansal", city: "Noida", room: "Full 2BHK", budget: "₹11L", est: "₹10L – ₹12.5L", src: "Instagram reference upload", when: "07 Jul", status: "contacted" },
];

const MORNING_BRIEFS = [
  { project: "Sharma Residence", work: "Kitchen upper cabinet install + wiring completion", team: "Sunil (carpentry), Arif (electrical)", eta: "Kitchen zone 90% by evening" },
  { project: "Verma Villa", work: "First-floor false ceiling framing continues", team: "Ravi's crew (4 members)", eta: "Framing done by 13 Jul" },
  { project: "Kapoor Apartment", work: "Final coat — living room & kitchen walls", team: "Deepak + 2 painters", eta: "Painting complete by 12 Jul" },
];

const STATUS_STYLE = {
  paid: { bg: "#E4EFE8", fg: "#3E7A5B", label: "Paid" },
  upcoming: { bg: "#F6ECD8", fg: "#A8741A", label: "Upcoming" },
  overdue: { bg: "#F6E0DA", fg: "#B3452E", label: "Overdue" },
  scheduled: { bg: "#ECEAE2", fg: "#6E6A5E", label: "Scheduled" },
  "on-track": { bg: "#E4EFE8", fg: "#3E7A5B", label: "On track" },
  attention: { bg: "#F6ECD8", fg: "#A8741A", label: "Needs attention" },
  new: { bg: "#EAE4F2", fg: "#6B4FA1", label: "New" },
  contacted: { bg: "#F6ECD8", fg: "#A8741A", label: "Contacted" },
  qualified: { bg: "#E4EFE8", fg: "#3E7A5B", label: "Qualified" },
};

/* ── Shared bits ── */
const Chip = ({ s }) => {
  const t = STATUS_STYLE[s] || STATUS_STYLE.scheduled;
  return <span className="dk-chip" style={{ background: t.bg, color: t.fg }}>{t.label}</span>;
};

const Swatches = ({ mats }) => (
  <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }} title={mats.join(", ")}>
    {mats.map((m) => <span key={m} className="dk-swatch" style={{ background: MATERIAL_COLORS[m] }} />)}
  </span>
);

const Bar = ({ v }) => (
  <div style={{ background: "#ECE9DF", borderRadius: 99, height: 6, width: "100%" }}>
    <div style={{ width: `${v}%`, height: 6, borderRadius: 99, background: "var(--brass)" }} />
  </div>
);

const Stat = ({ label, value, sub }) => (
  <div className="dk-card" style={{ padding: "16px 18px", flex: 1, minWidth: 150 }}>
    <div className="dk-eyebrow">{label}</div>
    <div className="dk-serif" style={{ fontSize: 30, fontWeight: 600, marginTop: 4 }}>{value}</div>
    <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>{sub}</div>
  </div>
);

const Avatar = ({ name }) => (
  <span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--brass-soft)", color: "var(--brass)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
    {name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
  </span>
);

/* ── Views ── */
function Overview({ goProject }) {
  return (
    <div>
      <div className="dk-eyebrow">Saturday, 11 July 2026</div>
      <h1 className="dk-serif" style={{ fontSize: 28, fontWeight: 600, margin: "4px 0 20px" }}>Good morning, Decoory team</h1>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Stat label="Active projects" value="3" sub="2 on track · 1 needs attention" />
        <Stat label="Payments due" value="₹11.3L" sub="1 overdue · 2 upcoming this month" />
        <Stat label="New leads" value="5" sub="3 from AI self-estimation tool" />
        <Stat label="Updates posted today" value="3 / 3" sub="All sites reported by 10 AM" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginTop: 20, alignItems: "start" }}>
        <div className="dk-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div>
              <div className="dk-eyebrow">Morning brief · sent 8:00 AM</div>
              <div className="dk-serif" style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>Today at your sites</div>
            </div>
            <span style={{ fontSize: 11, color: "var(--mut)" }}>Delivered as in-app notification</span>
          </div>
          {MORNING_BRIEFS.map((b) => (
            <div key={b.project} style={{ borderTop: "1px solid var(--line)", marginTop: 14, paddingTop: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{b.project}</div>
              <div style={{ fontSize: 13, marginTop: 3 }}>{b.work}</div>
              <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 3 }}>Team: {b.team} · {b.eta}</div>
            </div>
          ))}
        </div>

        <div className="dk-card" style={{ padding: 20 }}>
          <div className="dk-eyebrow">Attention</div>
          <div className="dk-serif" style={{ fontSize: 18, fontWeight: 600, margin: "2px 0 12px" }}>Needs action</div>
          {[
            { t: "Verma Villa — ₹6.40L overdue since 30 Jun", d: "In-app reminder repeating daily at 10 AM", tone: "bad", pid: "DCR-102" },
            { t: "Sharma Residence — ₹4.65L due 14 Jul", d: "Reminder scheduled 13 Jul, 6 PM (within 8AM–8PM window)", tone: "warn", pid: "DCR-101" },
            { t: "2 new self-estimation leads today", d: "Vivek Malhotra (₹8L) · Priya Nair (₹22L)", tone: "ok" },
          ].map((a, i) => (
            <div key={i} onClick={() => a.pid && goProject(a.pid)} style={{ borderLeft: `3px solid var(--${a.tone === "bad" ? "bad" : a.tone === "warn" ? "warn" : "ok"})`, padding: "8px 12px", background: "#FAF8F2", borderRadius: "0 8px 8px 0", marginBottom: 10, cursor: a.pid ? "pointer" : "default" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{a.t}</div>
              <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>{a.d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Projects({ goProject }) {
  return (
    <div>
      <h1 className="dk-serif" style={{ fontSize: 26, fontWeight: 600, marginBottom: 16 }}>Projects</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
        {PROJECTS.map((p) => (
          <div key={p.id} className="dk-card" style={{ padding: 18, cursor: "pointer" }} onClick={() => goProject(p.id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div className="dk-eyebrow">{p.id}</div>
                <div className="dk-serif" style={{ fontSize: 19, fontWeight: 600, marginTop: 2 }}>{p.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--mut)" }}>{p.type}</div>
              </div>
              <Chip s={p.health} />
            </div>
            <div style={{ margin: "14px 0 6px", display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              <span style={{ color: "var(--mut)" }}>{p.stage}</span><b>{p.progress}%</b>
            </div>
            <Bar v={p.progress} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, alignItems: "center" }}>
              <div style={{ fontSize: 12.5, color: "var(--mut)" }}>{p.paid} / {p.budget} received</div>
              <Swatches mats={p.materials} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectDetail({ project, back }) {
  const [tab, setTab] = useState("updates");
  return (
    <div>
      <button className="dk-btn ghost" onClick={back} style={{ marginBottom: 14 }}>← All projects</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div className="dk-eyebrow">{project.id} · Client: {project.client}</div>
          <h1 className="dk-serif" style={{ fontSize: 26, fontWeight: 600, margin: "2px 0" }}>{project.name}</h1>
          <div style={{ fontSize: 13, color: "var(--mut)" }}>{project.type} · Handover target {project.due}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <Chip s={project.health} />
          <div style={{ fontSize: 12.5, color: "var(--mut)", marginTop: 8 }}>{project.paid} received of {project.budget}</div>
        </div>
      </div>
      <div style={{ margin: "16px 0 4px", maxWidth: 520 }}><Bar v={project.progress} /></div>
      <div style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 14 }}>{project.progress}% complete — {project.stage}</div>

      <div style={{ borderBottom: "1px solid var(--line)", marginBottom: 18 }}>
        {[["updates", "Daily updates"], ["payments", "Payments"], ["team", "My Project Team"]].map(([k, l]) => (
          <button key={k} className={`dk-tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "updates" && (
        <div style={{ maxWidth: 640 }}>
          <div className="dk-card" style={{ padding: 16, marginBottom: 18, background: "#FBFAF6" }}>
            <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Post today's update</div>
            <textarea placeholder="What happened on site today? One line per item…" style={{ width: "100%", minHeight: 60, border: "1px solid var(--line)", borderRadius: 8, padding: 10, fontFamily: "inherit", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="dk-btn ghost">Attach photos</button>
              <button className="dk-btn">Publish update — client gets notified</button>
            </div>
          </div>
          {project.updates.map((u) => (
            <div key={u.date} style={{ display: "flex", gap: 14, marginBottom: 4 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--brass)", marginTop: 5 }} />
                <span style={{ width: 1, flex: 1, background: "var(--line)" }} />
              </div>
              <div style={{ paddingBottom: 18, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{u.date}</div>
                <ul style={{ margin: "6px 0", paddingLeft: 18, fontSize: 13.5, lineHeight: 1.55 }}>
                  {u.items.map((it) => <li key={it}>{it}</li>)}
                </ul>
                <span className="dk-chip" style={{ background: "var(--brass-soft)", color: "var(--brass)" }}>📷 {u.photos} site photos attached</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "payments" && (
        <div className="dk-card" style={{ maxWidth: 700, overflow: "hidden" }}>
          {project.payments.map((pay, i) => (
            <div key={pay.label} className="dk-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 18px", borderTop: i ? "1px solid var(--line)" : "none", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{pay.label}</div>
                <div style={{ fontSize: 12, color: "var(--mut)" }}>
                  Due {pay.due}{pay.reminder ? ` · Reminder: ${pay.reminder}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <b style={{ fontSize: 14 }}>{pay.amount}</b>
                <Chip s={pay.status} />
              </div>
            </div>
          ))}
          <div style={{ padding: "11px 18px", background: "#FBFAF6", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--mut)" }}>
            Reminders fire only between 8:00 AM – 8:00 PM, 6–10 hours before due time. On payment received, client gets an automatic thank-you note.
          </div>
        </div>
      )}

      {tab === "team" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12, maxWidth: 760 }}>
          {project.team.map((m) => (
            <div key={m.name} className="dk-card" style={{ padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
              <Avatar name={m.name} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.name}</div>
                <div style={{ fontSize: 12.5, color: "var(--mut)" }}>{m.role} · {m.phone}</div>
              </div>
            </div>
          ))}
          <div style={{ gridColumn: "1/-1", fontSize: 12, color: "var(--mut)" }}>
            This roster is visible to the client in their app as "My Project Team" — photo, name and role of everyone working in their home.
          </div>
        </div>
      )}
    </div>
  );
}

function Leads() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 className="dk-serif" style={{ fontSize: 26, fontWeight: 600 }}>Leads</h1>
          <div style={{ fontSize: 13, color: "var(--mut)", marginTop: 2 }}>Captured automatically from the AI self-estimation tool and design uploads — search, budget and preferences saved to CRM.</div>
        </div>
        <button className="dk-btn">Add lead manually</button>
      </div>
      <div className="dk-card" style={{ marginTop: 16, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 640 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--mut)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".06em" }}>
              {["Lead", "Scope", "Their budget", "AI estimate", "Source", "When", "Status"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LEADS.map((l) => (
              <tr key={l.name} className="dk-row" style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "11px 16px", display: "flex", gap: 10, alignItems: "center" }}><Avatar name={l.name} /><div><b>{l.name}</b><div style={{ fontSize: 12, color: "var(--mut)" }}>{l.city}</div></div></td>
                <td style={{ padding: "11px 16px" }}>{l.room}</td>
                <td style={{ padding: "11px 16px" }}>{l.budget}</td>
                <td style={{ padding: "11px 16px" }}>{l.est}</td>
                <td style={{ padding: "11px 16px", fontSize: 12.5, color: "var(--mut)" }}>{l.src}</td>
                <td style={{ padding: "11px 16px", fontSize: 12.5, color: "var(--mut)" }}>{l.when}</td>
                <td style={{ padding: "11px 16px" }}><Chip s={l.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Payments({ goProject }) {
  const rows = PROJECTS.flatMap((p) => p.payments.filter((x) => x.status !== "paid").map((x) => ({ ...x, project: p.name, pid: p.id })));
  const order = { overdue: 0, upcoming: 1, scheduled: 2 };
  rows.sort((a, b) => order[a.status] - order[b.status]);
  return (
    <div>
      <h1 className="dk-serif" style={{ fontSize: 26, fontWeight: 600 }}>Payments</h1>
      <div style={{ fontSize: 13, color: "var(--mut)", margin: "2px 0 16px" }}>All pending milestones across projects. Reminders are in-app only in this prototype (8 AM – 8 PM window, 6–10 hrs before due).</div>
      <div className="dk-card" style={{ maxWidth: 780, overflow: "hidden" }}>
        {rows.map((r, i) => (
          <div key={r.project + r.label} className="dk-row" onClick={() => goProject(r.pid)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 18px", borderTop: i ? "1px solid var(--line)" : "none", cursor: "pointer", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.project} — {r.label}</div>
              <div style={{ fontSize: 12, color: "var(--mut)" }}>Due {r.due}{r.reminder ? ` · Reminder: ${r.reminder}` : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}><b>{r.amount}</b><Chip s={r.status} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Clients({ goProject }) {
  return (
    <div>
      <h1 className="dk-serif" style={{ fontSize: 26, fontWeight: 600, marginBottom: 16 }}>Clients</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))", gap: 14 }}>
        {PROJECTS.map((p) => (
          <div key={p.id} className="dk-card" style={{ padding: 18 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Avatar name={p.client} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.client}</div>
                <div style={{ fontSize: 12.5, color: "var(--mut)" }}>{p.name} · {p.id}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <button className="dk-btn ghost" onClick={() => goProject(p.id)}>Open project</button>
              <button className="dk-btn ghost">Chat</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Team() {
  const all = [];
  PROJECTS.forEach((p) => p.team.forEach((m) => { if (!all.find((x) => x.name === m.name)) all.push({ ...m, projects: [p.name] }); else all.find((x) => x.name === m.name).projects.push(p.name); }));
  return (
    <div>
      <h1 className="dk-serif" style={{ fontSize: 26, fontWeight: 600 }}>Workforce</h1>
      <div style={{ fontSize: 13, color: "var(--mut)", margin: "2px 0 16px" }}>Assign people to sites — each project's roster appears in the client app for transparency.</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
        {all.map((m) => (
          <div key={m.name} className="dk-card" style={{ padding: 16, display: "flex", gap: 12 }}>
            <Avatar name={m.name} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--mut)" }}>{m.role}</div>
              <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 4 }}>On: {m.projects.join(", ")}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Shell ── */
const NAV = [
  ["overview", "◧", "Overview"],
  ["projects", "▤", "Projects"],
  ["payments", "₹", "Payments"],
  ["leads", "◎", "Leads"],
  ["clients", "☺", "Clients"],
  ["team", "⚒", "Workforce"],
];

export default function DecooryDashboard() {
  const [view, setView] = useState("overview");
  const [pid, setPid] = useState(null);
  const goProject = (id) => { setPid(id); setView("project"); };
  const project = PROJECTS.find((p) => p.id === pid);

  return (
    <div className="dk-root">
      <style>{css}</style>
      <aside className="dk-side">
        <div style={{ padding: "4px 12px 22px" }}>
          <div className="dk-serif" style={{ fontSize: 19, fontWeight: 600, letterSpacing: ".01em" }}>Decoory<span style={{ color: "var(--brass)" }}>.</span></div>
          <div className="lbl" style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "#8E8A7C", marginTop: 2 }}>Interior's · Admin</div>
        </div>
        {NAV.map(([k, icon, label]) => (
          <button key={k} className={`dk-nav ${view === k || (view === "project" && k === "projects") ? "on" : ""}`} onClick={() => setView(k)}>
            <span style={{ width: 18, textAlign: "center" }}>{icon}</span><span className="lbl">{label}</span>
          </button>
        ))}
        <div className="lbl" style={{ marginTop: "auto", padding: "14px 12px", fontSize: 11, color: "#8E8A7C", lineHeight: 1.6, borderTop: "1px solid #333B35" }}>
          ISO 9001:2015 Certified<br />10-yr structural warranty<br />Branded material only
        </div>
      </aside>
      <main className="dk-main">
        {view === "overview" && <Overview goProject={goProject} />}
        {view === "projects" && <Projects goProject={goProject} />}
        {view === "project" && project && <ProjectDetail project={project} back={() => setView("projects")} />}
        {view === "leads" && <Leads />}
        {view === "payments" && <Payments goProject={goProject} />}
        {view === "clients" && <Clients goProject={goProject} />}
        {view === "team" && <Team />}
      </main>
    </div>
  );
}
