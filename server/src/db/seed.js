// Seeds the exact mock data from the two prototypes (decoory-dashboard.jsx,
// decoory-client-app.jsx). Safe to re-run — wipes and reinserts every time.
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import db from "./index.js";
import { rupeesToPaise } from "../utils/money.js";
import { BRAND_INFO } from "../config/brands.js";
import { recomputeProgress } from "../services/progress.js";

const DEV_PASSWORD = "decoory123";

const TABLES_IN_DELETE_ORDER = [
  "notifications", "messages", "suggestions",
  "update_media", "daily_updates", "milestones", "payments", "materials",
  "project_team", "team_members", "leads", "documents",
  "projects", "users",
];

function wipe() {
  const tx = db.transaction(() => {
    for (const t of TABLES_IN_DELETE_ORDER) db.prepare(`DELETE FROM ${t}`).run();
  });
  tx();
}

// Rotating gradient palette used for site-photo placeholders (no real photo
// assets ship with this repo — see README "Media & seed photos").
const PALETTE = [
  ["#6B4F33", "#8A6A45"], ["#4A4E52", "#6E7378"], ["#7A5C3E", "#9C7B54"],
  ["#5C4A36", "#7E6748"], ["#8C8578", "#B0A897"], ["#6E5233", "#93744C"],
  ["#54483A", "#776852"], ["#8A5A33", "#A8823C"], ["#6E6A5E", "#9BA1A6"],
  ["#5E6B73", "#4C4A45"],
];

function placeholderMedia(count, captionPrefix) {
  return Array.from({ length: count }, (_, i) => {
    const [c1, c2] = PALETTE[i % PALETTE.length];
    return { path: `placeholder://${c1.slice(1)}-${c2.slice(1)}`, caption: `${captionPrefix} ${i + 1}` };
  });
}

function explicitMedia(entries) {
  return entries.map(([c1, c2, caption]) => ({ path: `placeholder://${c1.slice(1)}-${c2.slice(1)}`, caption }));
}

// Wall-clock IST instant, normalized to the same sortable UTC "Z" format
// the schema's runtime defaults use (see server README "Timestamp format") —
// mixing offset styles as raw strings breaks lexicographic ORDER BY.
const ist = (dateStr, time = "18:00:00") => new Date(`${dateStr}T${time}+05:30`).toISOString();

// Today's IST calendar date (offsetDays lets callers get yesterday/tomorrow) —
// used for the dashboard's "today"-scoped seed data (new leads, follow-ups,
// site visits) so they show real, non-zero numbers whenever seed is re-run,
// not just on the one fixed date the rest of the seed narrative assumes.
const istToday = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86400000 + 5.5 * 3600000).toISOString().slice(0, 10);

function run() {
  wipe();
  const passwordHash = bcrypt.hashSync(DEV_PASSWORD, 10);

  const insertUser = db.prepare(
    `INSERT INTO users (id, role, name, email, phone, password_hash) VALUES (?,?,?,?,?,?)`
  );
  const admin = { id: uuid(), name: "Decoory Admin", email: "admin@decoory.com", phone: "+919876500001" };
  insertUser.run(admin.id, "admin", admin.name, admin.email, admin.phone, passwordHash);

  const clients = {
    "DCR-101": { id: uuid(), name: "Rakesh Sharma", email: "rakesh.sharma@example.com", phone: "+919876500011" },
    "DCR-102": { id: uuid(), name: "Anita Verma", email: "anita.verma@example.com", phone: "+919876500012" },
    "DCR-103": { id: uuid(), name: "Neha Kapoor", email: "neha.kapoor@example.com", phone: "+919876500013" },
  };
  for (const c of Object.values(clients)) {
    insertUser.run(c.id, "client", c.name, c.email, c.phone, passwordHash);
  }

  const insertProject = db.prepare(`
    INSERT INTO projects (id, code, name, type, client_user_id, budget_paise, progress_pct, current_stage, start_date, handover_date, health, today_plan, today_team, pin)
    VALUES (@id,@code,@name,@type,@client_user_id,@budget_paise,@progress_pct,@current_stage,@start_date,@handover_date,@health,@today_plan,@today_team,@pin)
  `);

  const PROJECTS = [
    {
      id: uuid(), code: "DCR-101", name: "Sharma Residence", type: "3BHK · Sector 62, Noida",
      client_user_id: clients["DCR-101"].id, budget_paise: rupeesToPaise(1850000),
      progress_pct: 62, current_stage: "Modular kitchen install",
      start_date: "2026-05-02", handover_date: "2026-08-28", health: "on-track",
      today_plan: "Kitchen upper cabinet installation + electrical wiring completion. Kitchen zone reaches 90% by this evening.",
      today_team: "Sunil (carpentry) · Arif (electrical)", pin: "1101",
    },
    {
      id: uuid(), code: "DCR-102", name: "Verma Villa", type: "Duplex · Greater Noida West",
      client_user_id: clients["DCR-102"].id, budget_paise: rupeesToPaise(3200000),
      progress_pct: 34, current_stage: "Electrical & ceiling",
      start_date: "2026-06-05", handover_date: "2026-10-20", health: "attention",
      today_plan: "First-floor false ceiling framing continues. Framing done by 13 Jul.",
      today_team: "Ravi's crew (4 members)", pin: "1102",
    },
    {
      id: uuid(), code: "DCR-103", name: "Kapoor Apartment", type: "2BHK · Indirapuram, Ghaziabad",
      client_user_id: clients["DCR-103"].id, budget_paise: rupeesToPaise(980000),
      progress_pct: 88, current_stage: "Painting & finishing",
      start_date: "2026-03-10", handover_date: "2026-07-24", health: "on-track",
      today_plan: "Final coat — living room & kitchen walls. Painting complete by 12 Jul.",
      today_team: "Deepak + 2 painters", pin: "1103",
    },
  ];
  for (const p of PROJECTS) insertProject.run(p);
  const pid = Object.fromEntries(PROJECTS.map((p) => [p.code, p.id]));

  // ── Milestones — the checklist that drives progress_pct (see services/progress.js) ──
  const insertMilestone = db.prepare(`INSERT INTO milestones (id, project_id, title, done, sort_order, completed_at) VALUES (?,?,?,?,?,?)`);
  function seedMilestones(code, titles) {
    titles.forEach(([title, done], i) => {
      insertMilestone.run(uuid(), pid[code], title, done ? 1 : 0, i, done ? ist("2026-07-05") : null);
    });
    recomputeProgress(pid[code]);
  }

  seedMilestones("DCR-101", [
    ["Design finalized", true],
    ["Material procurement", true],
    ["Electrical & plumbing rough-in", true],
    ["Modular kitchen & wardrobe install", false],
    ["Painting & finishing", false],
  ]);
  seedMilestones("DCR-102", [
    ["Design finalized", true],
    ["Material procurement", true],
    ["Civil & electrical work", false],
    ["False ceiling & painting", false],
    ["Modular install & handover", false],
  ]);
  seedMilestones("DCR-103", [
    ["Design finalized", true],
    ["Material procurement", true],
    ["Modular kitchen & wardrobe install", true],
    ["Electrical & civil work", true],
    ["Painting & finishing", false],
  ]);

  // ── Daily updates + media ──
  const insertUpdate = db.prepare(`INSERT INTO daily_updates (id, project_id, update_date, items) VALUES (?,?,?,?)`);
  const insertMedia = db.prepare(`INSERT INTO update_media (id, update_id, file_path, kind) VALUES (?,?,?,'photo')`);

  function seedUpdates(code, updates) {
    for (const u of updates) {
      const id = uuid();
      insertUpdate.run(id, pid[code], u.date, JSON.stringify(u.items));
      for (const m of u.media) insertMedia.run(uuid(), id, `${m.path}?caption=${encodeURIComponent(m.caption)}`);
    }
  }

  seedUpdates("DCR-101", [
    {
      date: "2026-07-10",
      items: ["Modular kitchen lower cabinets completed", "Electrical wiring 80% complete", "Chimney duct routing marked"],
      media: explicitMedia([["#6B4F33", "#8A6A45", "Kitchen cabinets"], ["#4A4E52", "#6E7378", "Wiring — living room"], ["#7A5C3E", "#9C7B54", "Chimney duct"]]),
    },
    {
      date: "2026-07-09",
      items: ["Kitchen carcass assembly", "False ceiling POP finished in living room"],
      media: explicitMedia([["#5C4A36", "#7E6748", "Carcass work"], ["#8C8578", "#B0A897", "False ceiling"]]),
    },
    {
      date: "2026-07-08",
      items: ["Site material delivery — Century Ply BWP 12 sheets", "Wardrobe frame work started"],
      media: explicitMedia([["#6E5233", "#93744C", "Ply delivery"], ["#54483A", "#776852", "Wardrobe frame"]]),
    },
    {
      date: "2026-07-07",
      items: ["Electrical conduit work in bedrooms", "Kitchen granite template measured"],
      media: placeholderMedia(3, "Site photo"),
    },
  ]);

  seedUpdates("DCR-102", [
    { date: "2026-07-10", items: ["False ceiling framing — first floor", "AC copper piping routed"], media: placeholderMedia(5, "Site photo") },
    { date: "2026-07-09", items: ["Electrical wiring ground floor 60%"], media: placeholderMedia(2, "Site photo") },
  ]);

  seedUpdates("DCR-103", [
    { date: "2026-07-10", items: ["Second coat — bedrooms done", "Wardrobe shutters aligned & hardware fitted"], media: placeholderMedia(7, "Site photo") },
    { date: "2026-07-09", items: ["Primer coat complete", "Deep cleaning scheduled for 20 Jul"], media: placeholderMedia(3, "Site photo") },
  ]);

  // ── Payments ──
  const insertPayment = db.prepare(`
    INSERT INTO payments (id, project_id, label, amount_paise, due_at, status, paid_at)
    VALUES (@id,@project_id,@label,@amount_paise,@due_at,@status,@paid_at)
  `);
  function seedPayments(code, rows) {
    for (const r of rows) {
      insertPayment.run({
        id: uuid(), project_id: pid[code], label: r.label, amount_paise: rupeesToPaise(r.amount),
        due_at: ist(r.due), status: r.status, paid_at: r.status === "paid" ? ist(r.due, "12:00:00") : null,
      });
    }
  }

  seedPayments("DCR-101", [
    { label: "Booking advance (10%)", amount: 185000, due: "2026-05-02", status: "paid" },
    { label: "Design freeze (20%)", amount: 370000, due: "2026-05-24", status: "paid" },
    { label: "Material dispatch (30%)", amount: 555000, due: "2026-06-18", status: "paid" },
    { label: "Kitchen install (25%)", amount: 465000, due: "2026-07-14", status: "upcoming" },
    { label: "Handover (15%)", amount: 275000, due: "2026-08-26", status: "scheduled" },
  ]);
  seedPayments("DCR-102", [
    { label: "Booking advance (10%)", amount: 320000, due: "2026-06-05", status: "paid" },
    { label: "Design freeze (20%)", amount: 640000, due: "2026-06-30", status: "overdue" },
    { label: "Material dispatch (30%)", amount: 960000, due: "2026-08-08", status: "scheduled" },
  ]);
  seedPayments("DCR-103", [
    { label: "Booking advance (10%)", amount: 98000, due: "2026-03-10", status: "paid" },
    { label: "Design freeze (20%)", amount: 196000, due: "2026-04-02", status: "paid" },
    { label: "Material dispatch (40%)", amount: 392000, due: "2026-05-05", status: "paid" },
    { label: "Install milestone (20%)", amount: 196000, due: "2026-06-20", status: "paid" },
    { label: "Handover (10%)", amount: 98000, due: "2026-07-22", status: "upcoming" },
  ]);

  // ── Team members + assignments ──
  const insertMember = db.prepare(`INSERT INTO team_members (id, name, role, phone, note) VALUES (?,?,?,?,?)`);
  const insertAssign = db.prepare(`INSERT INTO project_team (project_id, team_member_id) VALUES (?,?)`);
  const MEMBERS = {
    mahesh: { name: "Mahesh Yadav", role: "Site supervisor", phone: "+91 98••• ••210", note: "Your daily point of contact" },
    sunil: { name: "Sunil Vishwakarma", role: "Head carpenter", phone: "+91 87••• ••934", note: "14 yrs experience · kitchen & wardrobes" },
    arif: { name: "Arif Khan", role: "Electrician", phone: "+91 99••• ••112", note: "Certified · wiring & fittings" },
    deepak: { name: "Deepak Rana", role: "Painter", phone: "+91 96••• ••870", note: "Joins from 18 Jul" },
    ravi: { name: "Ravi Bisht", role: "Site supervisor", phone: "+91 98••• ••441", note: "Crew lead — Verma Villa" },
    imran: { name: "Imran Saifi", role: "Electrician", phone: "+91 97••• ••306", note: "Certified · wiring & fittings" },
  };
  const memberId = {};
  for (const [key, m] of Object.entries(MEMBERS)) {
    memberId[key] = uuid();
    insertMember.run(memberId[key], m.name, m.role, m.phone, m.note);
  }
  const ASSIGN = {
    "DCR-101": ["mahesh", "sunil", "arif", "deepak"],
    "DCR-102": ["ravi", "imran"],
    "DCR-103": ["mahesh", "deepak"],
  };
  for (const [code, keys] of Object.entries(ASSIGN)) {
    for (const k of keys) insertAssign.run(pid[code], memberId[k]);
  }

  // ── Materials ──
  const insertMaterial = db.prepare(`INSERT INTO materials (id, project_id, brand, used_for, tagline) VALUES (?,?,?,?,?)`);
  const MATERIALS = {
    "DCR-101": ["Century Ply", "Hafele", "Virgo", "Hettich"],
    "DCR-102": ["Action TESA", "Hettich", "Century Ply"],
    "DCR-103": ["Century Ply", "Kwalit"],
  };
  for (const [code, brands] of Object.entries(MATERIALS)) {
    for (const brand of brands) {
      const info = BRAND_INFO[brand];
      insertMaterial.run(uuid(), pid[code], brand, info.used_for, info.tagline);
    }
  }

  // ── Leads ──
  // followUp/siteVisit/quoteStatus feed the Overview dashboard's "Today's
  // Actions" panel — see admin/Overview.jsx.
  const insertLead = db.prepare(`
    INSERT INTO leads (id, name, city, phone, scope, stated_budget_paise, ai_estimate_low_paise, ai_estimate_high_paise, source, status, search_data, follow_up_at, site_visit_at, quote_status, created_at)
    VALUES (@id,@name,@city,@phone,@scope,@stated_budget_paise,@ai_estimate_low_paise,@ai_estimate_high_paise,@source,@status,@search_data,@follow_up_at,@site_visit_at,@quote_status,@created_at)
  `);
  const LEADS = [
    { name: "Vivek Malhotra", city: "Noida", scope: "Living room", budget: 800000, lo: 740000, hi: 860000, source: "self-estimation", status: "new", quoteStatus: "none", created_at: ist(istToday(), "09:42:00") },
    { name: "Priya Nair", city: "Gurugram", scope: "Full 3BHK", budget: 2200000, lo: 1900000, hi: 2400000, source: "self-estimation", status: "new", quoteStatus: "none", created_at: ist(istToday(), "08:10:00") },
    { name: "Harshit Jain", city: "Ghaziabad", scope: "Modular kitchen", budget: 450000, lo: 390000, hi: 480000, source: "design-upload", status: "contacted", quoteStatus: "sent", followUpAt: ist(istToday(-1), "11:00:00"), created_at: ist("2026-07-10", "12:00:00") },
    { name: "Sana Qureshi", city: "Delhi", scope: "Master bedroom", budget: 320000, lo: 280000, hi: 350000, source: "self-estimation", status: "qualified", quoteStatus: "accepted", created_at: ist("2026-07-08", "12:00:00") },
    { name: "Rohit Bansal", city: "Noida", scope: "Full 2BHK", budget: 1100000, lo: 1000000, hi: 1250000, source: "design-upload", status: "contacted", quoteStatus: "sent", followUpAt: ist(istToday(), "16:00:00"), siteVisitAt: ist(istToday(), "15:00:00"), created_at: ist("2026-07-07", "12:00:00") },
  ];
  for (const l of LEADS) {
    insertLead.run({
      id: uuid(), name: l.name, city: l.city, phone: null, scope: l.scope,
      stated_budget_paise: rupeesToPaise(l.budget), ai_estimate_low_paise: rupeesToPaise(l.lo), ai_estimate_high_paise: rupeesToPaise(l.hi),
      source: l.source, status: l.status,
      follow_up_at: l.followUpAt || null, site_visit_at: l.siteVisitAt || null, quote_status: l.quoteStatus,
      search_data: JSON.stringify({ city: l.city, scope: l.scope, statedBudgetPaise: rupeesToPaise(l.budget), source: l.source }),
      created_at: l.created_at,
    });
  }

  // ── Suggestions (DCR-101) ──
  const insertSuggestion = db.prepare(`INSERT INTO suggestions (id, project_id, title, description, price_note, status) VALUES (?,?,?,?,?,?)`);
  insertSuggestion.run(uuid(), pid["DCR-101"], "Profile lighting upgrade", "Warm LED profile lights under your kitchen upper cabinets", "From ₹18,500", "sent");
  insertSuggestion.run(uuid(), pid["DCR-101"], "Smart corner storage", "Magic corner unit for the L-corner cabinet going in this week", null, "sent");

  // ── Messages (DCR-101) ──
  const insertMessage = db.prepare(`INSERT INTO messages (id, project_id, sender_user_id, sender_label, text, created_at) VALUES (?,?,?,?,?,?)`);
  insertMessage.run(uuid(), pid["DCR-101"], admin.id, "Mahesh (Supervisor)", "Good morning sir! Kitchen upper cabinets start today. Granite slab arrives by 2 PM.", ist("2026-07-11", "08:04:00"));
  insertMessage.run(uuid(), pid["DCR-101"], clients["DCR-101"].id, null, "Great. Please share a photo once granite is placed.", ist("2026-07-11", "08:12:00"));
  insertMessage.run(uuid(), pid["DCR-101"], admin.id, "Mahesh (Supervisor)", "Sure sir, will post it in today's update as well. 👍", ist("2026-07-11", "08:13:00"));

  // ── Documents (T&C + USP) ──
  const insertDoc = db.prepare(`INSERT INTO documents (id, section_key, title, body) VALUES (?,?,?,?)`);
  const DOCS = [
    ["warranty", "Warranty policy", "10-year structural warranty on all woodwork. Hardware carries manufacturer warranty (Hafele/Hettich lifetime on hinges)."],
    ["payment_terms", "Payment terms", "Milestone-based: 10% booking · 20% design freeze · 30% material · 25% installation · 15% handover."],
    ["material_policy", "Material policy", "Branded material only — brand and grade listed in your BOQ. Any substitution requires your written approval."],
    ["timeline_rules", "Timeline rules", "Committed handover date with weekly progress reporting. Delays beyond 15 days attract a rebate as per contract."],
    ["change_requests", "Change request policy", "Design changes after freeze are quoted separately and may adjust the timeline. Approved in-app."],
    ["service_terms", "Service terms", "Decoory Interior's provides end-to-end execution — design, procurement, site work and handover — through its verified in-house and partner workforce. Site access, utilities and approvals required for work to proceed are the client's responsibility unless otherwise agreed in writing."],
    ["usp", "Why Decoory", JSON.stringify(["ISO 9001:2015 certified company", "10-year structural warranty", "Branded material only", "On-time delivery commitment", "Pan-India interior service", "Transparent work process"])],
  ];
  for (const [key, title, body] of DOCS) insertDoc.run(uuid(), key, title, body);

  console.log("Seed complete.");
  console.log(`Admin login: ${admin.email} / ${DEV_PASSWORD}`);
  for (const [code, c] of Object.entries(clients)) {
    console.log(`Client ${code}: ${c.email} / ${DEV_PASSWORD}  |  project-code login: ${code} / PIN ${PROJECTS.find(p=>p.code===code).pin}`);
  }
}

run();
