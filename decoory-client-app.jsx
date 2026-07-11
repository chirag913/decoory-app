import { useState } from "react";

/* ── Decoory Interior's — Client App Prototype (Android) ──
   Shown inside a phone frame. Same brand system as admin:
   ink green · warm paper · brass. Client: Rakesh Sharma, DCR-101 */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Archivo:wght@400;500;600;700&display=swap');
:root{
  --ink:#1E2622; --ink2:#2A342E; --paper:#F4F2EC; --card:#FFFFFF;
  --brass:#A8823C; --brass-soft:#F0E7D2; --line:#E3DFD4;
  --ok:#3E7A5B; --warn:#C4841D; --bad:#B3452E; --mut:#6E6A5E;
}
.ca-stage{min-height:100vh;background:#23282A;display:flex;align-items:center;justify-content:center;padding:24px;font-family:'Archivo',system-ui,sans-serif}
.ca-phone{width:390px;max-width:100%;height:800px;max-height:92vh;background:var(--paper);border-radius:36px;border:10px solid #101312;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,.45)}
.ca-body{flex:1;overflow-y:auto;padding:18px 16px 8px}
.ca-serif{font-family:'Fraunces',Georgia,serif}
.ca-card{background:var(--card);border:1px solid var(--line);border-radius:14px}
.ca-chip{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;padding:3px 9px;border-radius:99px;letter-spacing:.02em}
.ca-eyebrow{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--brass)}
.ca-btn{background:var(--ink);color:#fff;border:none;border-radius:10px;padding:11px 16px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;width:100%}
.ca-btn.ghost{background:transparent;color:var(--ink);border:1.5px solid var(--line);width:auto;padding:8px 14px;font-weight:600}
.ca-tabbar{display:flex;background:var(--ink);padding:8px 6px 12px;flex-shrink:0}
.ca-tab{flex:1;background:none;border:none;color:#9A968A;font-size:10px;font-weight:600;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;font-family:inherit;padding:6px 0;border-radius:10px}
.ca-tab.on{color:#fff}
.ca-tab.on .ico{background:var(--brass);color:#fff}
.ca-tab .ico{width:34px;height:24px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px}
.ca-photo{border-radius:10px;height:84px;flex:1;display:flex;align-items:end;padding:8px;color:#fff;font-size:10px;font-weight:600;letter-spacing:.03em;min-width:0}
`;

const PROJECT = {
  id: "DCR-101", name: "Sharma Residence", client: "Rakesh",
  type: "3BHK · Sector 62, Noida", progress: 62, stage: "Modular kitchen install",
  handover: "28 Aug 2026", daysLeft: 48, budget: "₹18.5L", paid: "₹11.2L",
};

const BRIEF = {
  time: "Today, 8:00 AM",
  work: "Kitchen upper cabinet installation + electrical wiring completion",
  team: "Sunil (carpentry) · Arif (electrical)",
  eta: "Kitchen zone reaches 90% by this evening",
};

const UPDATES = [
  {
    date: "10 Jul 2026", tag: "Yesterday",
    items: ["Modular kitchen lower cabinets completed", "Electrical wiring 80% complete", "Chimney duct routing marked"],
    photos: [["#6B4F33", "#8A6A45", "Kitchen cabinets"], ["#4A4E52", "#6E7378", "Wiring — living room"], ["#7A5C3E", "#9C7B54", "Chimney duct"]],
  },
  {
    date: "09 Jul 2026", tag: "",
    items: ["Kitchen carcass assembly", "False ceiling POP finished in living room"],
    photos: [["#5C4A36", "#7E6748", "Carcass work"], ["#8C8578", "#B0A897", "False ceiling"]],
  },
  {
    date: "08 Jul 2026", tag: "",
    items: ["Material delivered — Century Ply BWP, 12 sheets", "Wardrobe frame work started"],
    photos: [["#6E5233", "#93744C", "Ply delivery"], ["#54483A", "#776852", "Wardrobe frame"]],
  },
];

const PAYMENTS = [
  { label: "Booking advance (10%)", amount: "₹1.85L", due: "02 May 2026", status: "paid" },
  { label: "Design freeze (20%)", amount: "₹3.70L", due: "24 May 2026", status: "paid" },
  { label: "Material dispatch (30%)", amount: "₹5.55L", due: "18 Jun 2026", status: "paid" },
  { label: "Kitchen install (25%)", amount: "₹4.65L", due: "14 Jul 2026", status: "due" },
  { label: "Handover (15%)", amount: "₹2.75L", due: "26 Aug 2026", status: "scheduled" },
];

const TEAM = [
  { name: "Mahesh Yadav", role: "Site supervisor", note: "Your daily point of contact" },
  { name: "Sunil Vishwakarma", role: "Head carpenter", note: "14 yrs experience · kitchen & wardrobes" },
  { name: "Arif Khan", role: "Electrician", note: "Certified · wiring & fittings" },
  { name: "Deepak Rana", role: "Painter", note: "Joins from 18 Jul" },
];

const BRANDS = [
  { name: "Century Ply", use: "BWP plywood — kitchen & wardrobes", tag: "Waterproof · 8-yr warranty", c: "#8A5A33" },
  { name: "Hafele", use: "Kitchen hardware & soft-close hinges", tag: "German engineering", c: "#9BA1A6" },
  { name: "Virgo", use: "Laminates — living room panels", tag: "Scratch resistant", c: "#C9B18C" },
  { name: "Hettich", use: "Drawer channels", tag: "50,000-cycle tested", c: "#5E6B73" },
];

const SUGGESTIONS = [
  { title: "Profile lighting upgrade", desc: "Warm LED profile lights under your kitchen upper cabinets — quotes from ₹18,500", tag: "Suggested for your kitchen" },
  { title: "Smart corner storage", desc: "Magic corner unit for the L-corner cabinet going in this week", tag: "Fits your current layout" },
];

const CHAT = [
  { from: "them", who: "Mahesh (Supervisor)", text: "Good morning sir! Kitchen upper cabinets start today. Granite slab arrives by 2 PM.", time: "8:04 AM" },
  { from: "me", text: "Great. Please share a photo once granite is placed.", time: "8:12 AM" },
  { from: "them", who: "Mahesh (Supervisor)", text: "Sure sir, will post it in today's update as well. 👍", time: "8:13 AM" },
];

const STATUS = {
  paid: { bg: "#E4EFE8", fg: "#3E7A5B", label: "Paid ✓" },
  due: { bg: "#F6ECD8", fg: "#A8741A", label: "Due 14 Jul" },
  scheduled: { bg: "#ECEAE2", fg: "#6E6A5E", label: "Scheduled" },
};

const Chip = ({ s }) => <span className="ca-chip" style={{ background: STATUS[s].bg, color: STATUS[s].fg }}>{STATUS[s].label}</span>;

const Avatar = ({ name, size = 38 }) => (
  <span style={{ width: size, height: size, borderRadius: "50%", background: "var(--brass-soft)", color: "var(--brass)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size / 2.8, flexShrink: 0 }}>
    {name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
  </span>
);

const Photo = ({ p }) => (
  <div className="ca-photo" style={{ background: `linear-gradient(135deg, ${p[0]}, ${p[1]})` }}>{p[2]}</div>
);

const Bar = ({ v }) => (
  <div style={{ background: "#ECE9DF", borderRadius: 99, height: 7, width: "100%" }}>
    <div style={{ width: `${v}%`, height: 7, borderRadius: 99, background: "var(--brass)" }} />
  </div>
);

const SectionTitle = ({ eyebrow, title }) => (
  <div style={{ margin: "4px 2px 12px" }}>
    <div className="ca-eyebrow">{eyebrow}</div>
    <div className="ca-serif" style={{ fontSize: 21, fontWeight: 600, marginTop: 2 }}>{title}</div>
  </div>
);

/* ── Screens ── */
function Home({ go }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div className="ca-eyebrow">Saturday, 11 July</div>
          <div className="ca-serif" style={{ fontSize: 23, fontWeight: 600 }}>Good morning, {PROJECT.client} ☀️</div>
        </div>
        <span onClick={() => go("chat")} style={{ position: "relative", cursor: "pointer", fontSize: 20 }}>💬<span style={{ position: "absolute", top: -3, right: -5, width: 9, height: 9, background: "var(--bad)", borderRadius: "50%" }} /></span>
      </div>

      {/* Progress hero */}
      <div className="ca-card" style={{ padding: 16, background: "var(--ink)", color: "#EDEAE0", border: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 11, color: "#9A968A", letterSpacing: ".1em", textTransform: "uppercase", fontWeight: 700 }}>{PROJECT.name} · {PROJECT.id}</div>
            <div className="ca-serif" style={{ fontSize: 30, fontWeight: 600, marginTop: 4 }}>{PROJECT.progress}%<span style={{ fontSize: 13, fontWeight: 400, color: "#9A968A" }}> complete</span></div>
          </div>
          <div style={{ textAlign: "right", fontSize: 11.5, color: "#C9C5B6" }}>Handover<br /><b style={{ color: "#fff", fontSize: 13 }}>{PROJECT.handover}</b><br />{PROJECT.daysLeft} days to go</div>
        </div>
        <div style={{ margin: "12px 0 6px" }}><Bar v={PROJECT.progress} /></div>
        <div style={{ fontSize: 12, color: "#C9C5B6" }}>Current stage: {PROJECT.stage}</div>
      </div>

      {/* Morning brief */}
      <div className="ca-card" style={{ padding: 14, marginTop: 12, borderLeft: "3px solid var(--brass)" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span className="ca-eyebrow">Today at your site</span>
          <span style={{ fontSize: 10.5, color: "var(--mut)" }}>{BRIEF.time}</span>
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 6 }}>{BRIEF.work}</div>
        <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 4 }}>Team: {BRIEF.team}</div>
        <div style={{ fontSize: 12, color: "var(--ok)", marginTop: 2, fontWeight: 600 }}>◷ {BRIEF.eta}</div>
      </div>

      {/* Yesterday's update preview */}
      <div className="ca-card" style={{ padding: 14, marginTop: 12, cursor: "pointer" }} onClick={() => go("updates")}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="ca-eyebrow">Latest site update</span>
          <span style={{ fontSize: 12, color: "var(--brass)", fontWeight: 700 }}>View all →</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {UPDATES[0].photos.slice(0, 3).map((p) => <Photo key={p[2]} p={p} />)}
        </div>
        <div style={{ fontSize: 12.5, marginTop: 8, color: "var(--mut)" }}>{UPDATES[0].items[0]} · +{UPDATES[0].items.length - 1} more</div>
      </div>

      {/* Payment due */}
      <div className="ca-card" style={{ padding: 14, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Kitchen install milestone</div>
            <div style={{ fontSize: 12, color: "var(--mut)" }}>₹4.65L · due 14 Jul</div>
          </div>
          <button className="ca-btn" style={{ width: "auto", padding: "9px 18px" }} onClick={() => go("payments")}>Pay now</button>
        </div>
      </div>

      {/* Upsell suggestion (every 10 days) */}
      <div className="ca-card" style={{ padding: 14, marginTop: 12, background: "var(--brass-soft)", border: "none" }}>
        <div className="ca-eyebrow" style={{ color: "#8A6A28" }}>Idea for your home</div>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 4 }}>{SUGGESTIONS[0].title}</div>
        <div style={{ fontSize: 12.5, color: "#5C4E30", marginTop: 3 }}>{SUGGESTIONS[0].desc}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button className="ca-btn ghost" style={{ background: "#fff" }}>I'm interested</button>
          <button className="ca-btn ghost" style={{ border: "none" }}>Maybe later</button>
        </div>
      </div>
      <div style={{ height: 10 }} />
    </div>
  );
}

function Updates() {
  return (
    <div>
      <SectionTitle eyebrow="Progress history" title="Daily site updates" />
      {UPDATES.map((u) => (
        <div key={u.date} className="ca-card" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b style={{ fontSize: 13.5 }}>{u.date}</b>
            {u.tag && <span className="ca-chip" style={{ background: "var(--brass-soft)", color: "var(--brass)" }}>{u.tag}</span>}
          </div>
          <ul style={{ margin: "8px 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
            {u.items.map((it) => <li key={it}>{it}</li>)}
          </ul>
          <div style={{ display: "flex", gap: 8 }}>
            {u.photos.map((p) => <Photo key={p[2]} p={p} />)}
          </div>
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: "var(--mut)", textAlign: "center", padding: "4px 0 14px" }}>You get a notification the moment a new update is posted.</div>
    </div>
  );
}

function Payments() {
  const [paidNow, setPaidNow] = useState(false);
  return (
    <div>
      <SectionTitle eyebrow="Transparent billing" title="Payment schedule" />
      <div className="ca-card" style={{ padding: "12px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span style={{ color: "var(--mut)" }}>Received so far</span><b>{PROJECT.paid} of {PROJECT.budget}</b>
      </div>
      {PAYMENTS.map((p) => (
        <div key={p.label} className="ca-card" style={{ padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.label}</div>
              <div style={{ fontSize: 12, color: "var(--mut)" }}>{p.amount} · {p.status === "paid" ? "Paid" : `Due ${p.due}`}</div>
            </div>
            <Chip s={p.status} />
          </div>
          {p.status === "due" && !paidNow && (
            <button className="ca-btn" style={{ marginTop: 10 }} onClick={() => setPaidNow(true)}>Pay ₹4.65L securely</button>
          )}
          {p.status === "due" && paidNow && (
            <div style={{ marginTop: 10, background: "#E4EFE8", borderRadius: 10, padding: 12, fontSize: 12.5, color: "#2E5C45", lineHeight: 1.5 }}>
              ✓ Payment received — receipt sent to your email.<br />
              <b>Thank you for your valuable payment.</b> Decoory Interior's is committed to building the home of your dreams. 🏡
            </div>
          )}
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: "var(--mut)", textAlign: "center", padding: "2px 0 14px" }}>Gentle reminders arrive 6–10 hrs before due time, only between 8 AM – 8 PM.</div>
    </div>
  );
}

function Team() {
  return (
    <div>
      <SectionTitle eyebrow="Who's in your home" title="My Project Team" />
      {TEAM.map((m) => (
        <div key={m.name} className="ca-card" style={{ padding: 14, marginBottom: 10, display: "flex", gap: 12, alignItems: "center" }}>
          <Avatar name={m.name} size={44} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{m.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--brass)", fontWeight: 600 }}>{m.role}</div>
            <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 2 }}>{m.note}</div>
          </div>
        </div>
      ))}
      <div className="ca-card" style={{ padding: 14, background: "#FBFAF6" }}>
        <div style={{ fontSize: 12.5, color: "var(--mut)", lineHeight: 1.6 }}>Every Decoory team member is verified and background-checked. Your supervisor Mahesh is reachable in chat during work hours.</div>
      </div>
    </div>
  );
}

function More({ go }) {
  const [open, setOpen] = useState(null);
  const TERMS = [
    ["Warranty policy", "10-year structural warranty on all woodwork. Hardware carries manufacturer warranty (Hafele/Hettich lifetime on hinges)."],
    ["Payment terms", "Milestone-based: 10% booking · 20% design freeze · 30% material · 25% installation · 15% handover."],
    ["Material policy", "Branded material only — brand and grade listed in your BOQ. Any substitution requires your written approval."],
    ["Timeline rules", "Committed handover date with weekly progress reporting. Delays beyond 15 days attract a rebate as per contract."],
    ["Change request policy", "Design changes after freeze are quoted separately and may adjust the timeline. Approved in-app."],
  ];
  return (
    <div>
      <SectionTitle eyebrow="Materials in your home" title="Brands we're using" />
      {BRANDS.map((b) => (
        <div key={b.name} className="ca-card" style={{ padding: 14, marginBottom: 10, display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: b.c, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{b.name}</div>
            <div style={{ fontSize: 12, color: "var(--mut)" }}>{b.use}</div>
          </div>
          <span className="ca-chip" style={{ background: "var(--brass-soft)", color: "var(--brass)" }}>{b.tag}</span>
        </div>
      ))}

      <div style={{ height: 8 }} />
      <SectionTitle eyebrow="Why Decoory" title="Our promise" />
      <div className="ca-card" style={{ padding: 14, marginBottom: 14 }}>
        {["ISO 9001:2015 certified company", "10-year structural warranty", "Branded material only", "On-time delivery commitment", "Pan-India interior service", "Transparent work process"].map((u) => (
          <div key={u} style={{ fontSize: 13, padding: "5px 0", display: "flex", gap: 8 }}><span style={{ color: "var(--ok)", fontWeight: 700 }}>✓</span>{u}</div>
        ))}
      </div>

      <SectionTitle eyebrow="Documents" title="Terms & policies" />
      {TERMS.map(([t, d], i) => (
        <div key={t} className="ca-card" style={{ padding: "12px 14px", marginBottom: 8, cursor: "pointer" }} onClick={() => setOpen(open === i ? null : i)}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 700 }}>{t}<span style={{ color: "var(--brass)" }}>{open === i ? "−" : "+"}</span></div>
          {open === i && <div style={{ fontSize: 12.5, color: "var(--mut)", marginTop: 8, lineHeight: 1.6 }}>{d}</div>}
        </div>
      ))}

      <div className="ca-card" style={{ padding: 14, margin: "14px 0", background: "var(--ink)", border: "none", color: "#EDEAE0", cursor: "pointer" }} onClick={() => go("chat")}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>Need something? Talk to us 💬</div>
        <div style={{ fontSize: 12, color: "#9A968A", marginTop: 3 }}>Chat with your supervisor · share reference designs · raise a change request</div>
      </div>
    </div>
  );
}

function Chat({ back }) {
  const [msgs, setMsgs] = useState(CHAT);
  const [txt, setTxt] = useState("");
  const send = () => { if (!txt.trim()) return; setMsgs([...msgs, { from: "me", text: txt.trim(), time: "Now" }]); setTxt(""); };
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
        <button className="ca-btn ghost" onClick={back} style={{ padding: "6px 10px" }}>←</button>
        <Avatar name="Decoory Team" size={34} />
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Decoory Team</div>
          <div style={{ fontSize: 11, color: "var(--ok)", fontWeight: 600 }}>● Online · replies in ~10 min</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.from === "me" ? "flex-end" : "flex-start", marginBottom: 10 }}>
            <div style={{ maxWidth: "78%", background: m.from === "me" ? "var(--ink)" : "#fff", color: m.from === "me" ? "#fff" : "var(--ink)", border: m.from === "me" ? "none" : "1px solid var(--line)", borderRadius: m.from === "me" ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "9px 12px" }}>
              {m.who && <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--brass)", marginBottom: 2 }}>{m.who}</div>}
              <div style={{ fontSize: 13, lineHeight: 1.45 }}>{m.text}</div>
              <div style={{ fontSize: 9.5, opacity: 0.6, marginTop: 3, textAlign: "right" }}>{m.time}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
        <button className="ca-btn ghost" title="Upload a reference design" style={{ padding: "8px 11px" }}>📎</button>
        <input value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Message or share a design idea…" style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 10, padding: "0 12px", fontSize: 13, fontFamily: "inherit", background: "#fff" }} />
        <button className="ca-btn" style={{ width: "auto", padding: "8px 14px" }} onClick={send}>Send</button>
      </div>
    </div>
  );
}

/* ── Shell ── */
const TABS = [
  ["home", "⌂", "Home"],
  ["updates", "▤", "Updates"],
  ["payments", "₹", "Payments"],
  ["team", "☺", "Team"],
  ["more", "≡", "More"],
];

export default function DecooryClientApp() {
  const [view, setView] = useState("home");
  return (
    <div className="ca-stage">
      <style>{css}</style>
      <div className="ca-phone">
        <div className="ca-body">
          {view === "home" && <Home go={setView} />}
          {view === "updates" && <Updates />}
          {view === "payments" && <Payments />}
          {view === "team" && <Team />}
          {view === "more" && <More go={setView} />}
          {view === "chat" && <Chat back={() => setView("home")} />}
        </div>
        <div className="ca-tabbar">
          {TABS.map(([k, icon, label]) => (
            <button key={k} className={`ca-tab ${view === k ? "on" : ""}`} onClick={() => setView(k)}>
              <span className="ico">{icon}</span>{label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
