import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { formatINR, formatDate } from "../shared/format.js";
import { Avatar, Chip, Spinner } from "../shared/ui.jsx";
import { LEAD_STAGES } from "../shared/leadStages.js";

const SOURCES = ["manual", "facebook", "google", "referral", "website", "self-estimation", "design-upload"];
const SOURCE_LABEL = { manual: "Manual", facebook: "Facebook", google: "Google", referral: "Referral", website: "Website", "self-estimation": "Self-estimation tool", "design-upload": "Design upload" };

const STAGE_ORDER = Object.fromEntries(LEAD_STAGES.map((s, i) => [s.key, i]));
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const PAGE_SIZE = 30;

function parseBulkLines(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, phone, budget, scope] = line.split(",").map((s) => (s || "").trim());
      return {
        name,
        phone: phone || null,
        statedBudgetPaise: budget ? Math.round(Number(budget) * 100) : null,
        scope: scope || null,
      };
    })
    .filter((l) => l.name);
}

function BulkAddForm({ onDone, onClose }) {
  const [text, setText] = useState("");
  const [source, setSource] = useState("manual");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState("");

  const parsed = parseBulkLines(text);

  const importAll = async () => {
    if (!parsed.length) return;
    setSaving(true);
    setResult("");
    let ok = 0, fail = 0;
    for (const fields of parsed) {
      try {
        await api.post("/leads", { ...fields, source });
        ok++;
      } catch {
        fail++;
      }
    }
    setSaving(false);
    setResult(`Imported ${ok} lead${ok === 1 ? "" : "s"}${fail ? `, ${fail} failed` : ""}.`);
    setText("");
    onDone();
  };

  return (
    <div className="dk-card" style={{ padding: 16, marginBottom: 16, background: "#FBFAF6" }}>
      <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Bulk add leads</div>
      <div style={{ fontSize: 12, color: "var(--mut)", marginBottom: 8 }}>
        One lead per line: <code>Name, Phone, Budget, Property type</code> — only Name is required. Example: <code>Ravi Kumar, 9876543210, 1500000, 3BHK</code>
      </div>
      <textarea
        className="dk-textarea" style={{ minHeight: 120, fontFamily: "monospace", fontSize: 12.5 }}
        placeholder={"Ravi Kumar, 9876543210, 1500000, 3BHK\nMeera Iyer, 9123456780, 900000, 2BHK"}
        value={text} onChange={(e) => setText(e.target.value)}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
        <select className="dk-select" style={{ width: 160 }} value={source} onChange={(e) => setSource(e.target.value)}>
          {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
        </select>
        <button className="dk-btn" disabled={saving || !parsed.length} onClick={importAll}>
          {saving ? "Importing…" : `Import ${parsed.length || ""} lead${parsed.length === 1 ? "" : "s"}`}
        </button>
        <button className="dk-btn ghost" onClick={onClose}>Cancel</button>
        {result && <span style={{ fontSize: 12.5, color: "var(--ok)" }}>{result}</span>}
      </div>
    </div>
  );
}

function AddLeadForm({ onAdded, onClose }) {
  const [form, setForm] = useState({ name: "", city: "", phone: "", scope: "", budget: "", source: "manual", date: "" });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await api.post("/leads", {
        name: form.name, city: form.city || null, phone: form.phone || null, scope: form.scope || null,
        statedBudgetPaise: form.budget ? Math.round(Number(form.budget) * 100) : null, source: form.source,
        createdAt: form.date ? new Date(`${form.date}T12:00:00.000Z`).toISOString() : undefined,
      });
      onAdded();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dk-card" style={{ padding: 16, marginBottom: 16, background: "#FBFAF6" }}>
      <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Add lead manually</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="dk-input" style={{ width: 180 }} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="dk-input" style={{ width: 140 }} placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input className="dk-input" style={{ width: 160 }} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="dk-input" style={{ width: 180 }} placeholder="Property type, e.g. 3BHK" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} />
        <input className="dk-input" style={{ width: 140 }} type="number" placeholder="Budget (₹)" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
        <select className="dk-select" style={{ width: 140 }} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
          {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
        </select>
        <label style={{ fontSize: 11.5, color: "var(--mut)" }}>
          Lead date (optional — today if blank)
          <input className="dk-input" style={{ width: 160, marginTop: 2 }} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="dk-btn" disabled={saving || !form.name} onClick={save}>{saving ? "Saving…" : "Add lead"}</button>
        <button className="dk-btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function SortHeader({ label, sortKey, sort, setSort }) {
  const active = sort.key === sortKey;
  return (
    <th
      style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 700, cursor: "pointer", userSelect: "none" }}
      onClick={() => setSort((s) => (s.key === sortKey ? { key: sortKey, dir: s.dir === "asc" ? "desc" : "asc" } : { key: sortKey, dir: "asc" }))}
    >
      {label}{active ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );
}

export default function Leads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState(null);
  const [adding, setAdding] = useState(false);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [hideLost, setHideLost] = useState(true);
  const [stageFilter, setStageFilter] = useState("all");
  const [sort, setSort] = useState({ key: null, dir: "asc" });
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const load = () => api.get("/leads").then(({ leads }) => setLeads(leads));
  useEffect(() => { load(); }, []);

  const removeLead = async (l, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete the lead for ${l.name}? This cannot be undone.`)) return;
    await api.del(`/leads/${l.id}`);
    load();
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkDelete = async () => {
    if (!selected.size) return;
    if (!window.confirm(`Delete ${selected.size} selected lead${selected.size === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selected].map((id) => api.del(`/leads/${id}`)));
    } finally {
      setBulkDeleting(false);
      setSelected(new Set());
      load();
    }
  };

  const visible = useMemo(() => {
    if (!leads) return [];
    let rows = leads;
    if (stageFilter !== "all") rows = rows.filter((l) => l.status === stageFilter);
    else if (hideLost) rows = rows.filter((l) => l.status !== "lost");
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((l) => l.name.toLowerCase().includes(q) || (l.phone || "").includes(q) || (l.whatsapp || "").includes(q));
    if (sort.key) {
      rows = [...rows].sort((a, b) => {
        let av, bv;
        if (sort.key === "stage") { av = STAGE_ORDER[a.status] ?? 99; bv = STAGE_ORDER[b.status] ?? 99; }
        else if (sort.key === "priority") { av = PRIORITY_ORDER[a.priority] ?? 9; bv = PRIORITY_ORDER[b.priority] ?? 9; }
        else if (sort.key === "budget") { av = a.statedBudgetPaise || 0; bv = b.statedBudgetPaise || 0; }
        else if (sort.key === "revenue") { av = a.expectedRevenuePaise || 0; bv = b.expectedRevenuePaise || 0; }
        else if (sort.key === "when") { av = a.createdAt; bv = b.createdAt; }
        if (av < bv) return -1;
        if (av > bv) return 1;
        return 0;
      });
      if (sort.dir === "desc") rows.reverse();
    }
    return rows;
  }, [leads, stageFilter, hideLost, sort, search]);

  useEffect(() => { setPage(1); }, [stageFilter, hideLost, sort, search]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paginated = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (!leads) return <Spinner />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 600 }}>Leads</h1>
          <div style={{ fontSize: 13, color: "var(--mut)", marginTop: 2 }}>Table view of the Sales Pipeline — for the Kanban board, switch to the Kanban tab above.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="dk-btn ghost" onClick={() => setBulkAdding((v) => !v)}>Bulk add</button>
          <button className="dk-btn" onClick={() => setAdding((v) => !v)}>Add lead manually</button>
        </div>
      </div>

      {adding && <div style={{ marginTop: 16 }}><AddLeadForm onAdded={load} onClose={() => setAdding(false)} /></div>}
      {bulkAdding && <div style={{ marginTop: 16 }}><BulkAddForm onDone={load} onClose={() => setBulkAdding(false)} /></div>}

      <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
        <input className="dk-input" style={{ width: 220 }} placeholder="Search name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="dk-select" style={{ width: 200 }} value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="all">All stages</option>
          {LEAD_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        {stageFilter === "all" && (
          <label style={{ fontSize: 12.5, color: "var(--mut)", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={hideLost} onChange={(e) => setHideLost(e.target.checked)} />
            Hide lost leads
          </label>
        )}
        <span style={{ fontSize: 12, color: "var(--mut)" }}>
          {visible.length === 0 ? "0" : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, visible.length)}`} of {visible.length} lead{visible.length === 1 ? "" : "s"}
          {visible.length !== leads.length ? ` (${leads.length} total)` : ""}
        </span>
        {selected.size > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
            <span style={{ fontSize: 12.5, color: "var(--mut)" }}>{selected.size} selected</span>
            <button className="dk-btn" style={{ background: "var(--bad)" }} disabled={bulkDeleting} onClick={bulkDelete}>
              {bulkDeleting ? "Deleting…" : `Delete ${selected.size}`}
            </button>
            <span style={{ fontSize: 12, color: "var(--mut)", cursor: "pointer" }} onClick={() => setSelected(new Set())}>Clear</span>
          </div>
        )}
      </div>

      <div className="dk-card" style={{ marginTop: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 780 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--mut)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".06em" }}>
              <th style={{ padding: "12px 8px 12px 16px", borderBottom: "1px solid var(--line)", width: 20 }}>
                <input
                  type="checkbox"
                  checked={paginated.length > 0 && paginated.every((l) => selected.has(l.id))}
                  onChange={(e) => setSelected(e.target.checked ? new Set(paginated.map((l) => l.id)) : new Set())}
                />
              </th>
              <th style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 700 }}>Lead</th>
              <th style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 700 }}>Scope</th>
              <SortHeader label="Their budget" sortKey="budget" sort={sort} setSort={setSort} />
              <SortHeader label="Expected revenue" sortKey="revenue" sort={sort} setSort={setSort} />
              <th style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 700 }}>Owner</th>
              <th style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 700 }}>Source</th>
              <SortHeader label="When" sortKey="when" sort={sort} setSort={setSort} />
              <SortHeader label="Stage" sortKey="stage" sort={sort} setSort={setSort} />
              <SortHeader label="Priority" sortKey="priority" sort={sort} setSort={setSort} />
              <th style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 700 }}></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((l) => (
              <tr key={l.id} className="dk-row" style={{ borderBottom: "1px solid var(--line)", cursor: "pointer", background: selected.has(l.id) ? "var(--brass-soft)" : undefined }} onClick={() => navigate(`/admin/leads/${l.id}`)}>
                <td style={{ padding: "11px 8px 11px 16px" }}>
                  <input type="checkbox" checked={selected.has(l.id)} onChange={(e) => toggleSelect(l.id, e)} onClick={(e) => e.stopPropagation()} />
                </td>
                <td style={{ padding: "11px 16px", display: "flex", gap: 10, alignItems: "center" }}>
                  <Avatar name={l.name} />
                  <div>
                    <div style={{ fontSize: 10.5, color: "var(--mut)", fontWeight: 700 }}>{l.leadCode}</div>
                    <b>{l.name}</b>
                    <div style={{ fontSize: 12, color: "var(--mut)" }}>{l.city || "—"}</div>
                  </div>
                </td>
                <td style={{ padding: "11px 16px" }}>{l.scope || "—"}</td>
                <td style={{ padding: "11px 16px" }}>{formatINR(l.statedBudgetPaise)}</td>
                <td style={{ padding: "11px 16px" }}>{formatINR(l.expectedRevenuePaise)}</td>
                <td style={{ padding: "11px 16px", fontSize: 12.5, color: "var(--mut)" }}>{l.leadOwner || "—"}</td>
                <td style={{ padding: "11px 16px", fontSize: 12.5, color: "var(--mut)" }}>{SOURCE_LABEL[l.source] || l.source.replace("-", " ")}</td>
                <td style={{ padding: "11px 16px", fontSize: 12.5, color: "var(--mut)" }}>{formatDate(l.createdAt)}</td>
                <td style={{ padding: "11px 16px" }}><Chip status={l.status} /></td>
                <td style={{ padding: "11px 16px" }}><Chip status={l.priority} /></td>
                <td style={{ padding: "11px 16px" }}>
                  <span style={{ color: "var(--bad)", fontSize: 12.5, cursor: "pointer" }} onClick={(e) => removeLead(l, e)}>Delete</span>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={11} style={{ padding: 24, textAlign: "center", color: "var(--mut)", fontSize: 13 }}>No leads match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 14 }}>
          <button className="dk-btn ghost" style={{ padding: "6px 12px" }} disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span style={{ fontSize: 12.5, color: "var(--mut)" }}>Page {currentPage} of {pageCount}</span>
          <button className="dk-btn ghost" style={{ padding: "6px 12px" }} disabled={currentPage === pageCount} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
