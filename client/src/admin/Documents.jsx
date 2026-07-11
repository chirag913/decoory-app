import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { Spinner } from "../shared/ui.jsx";

function UspEditor({ doc, onSaved }) {
  const [items, setItems] = useState(doc.body);
  const [saving, setSaving] = useState(false);

  const update = (i, val) => setItems((arr) => arr.map((x, idx) => (idx === i ? val : x)));
  const remove = (i) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const add = () => setItems((arr) => [...arr, ""]);

  const save = async () => {
    setSaving(true);
    try {
      const { document } = await api.patch(`/documents/${doc.key}`, { body: items.filter((s) => s.trim()) });
      onSaved(document);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dk-card" style={{ padding: 16 }}>
      <div className="dk-eyebrow" style={{ marginBottom: 8 }}>{doc.title}</div>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <input className="dk-input" value={it} onChange={(e) => update(i, e.target.value)} />
          <button className="dk-btn ghost" onClick={() => remove(i)}>✕</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="dk-btn ghost" onClick={add}>+ Add item</button>
        <button className="dk-btn" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}

function DocEditor({ doc, onSaved }) {
  const [body, setBody] = useState(doc.body);
  const [saving, setSaving] = useState(false);
  const dirty = body !== doc.body;

  const save = async () => {
    setSaving(true);
    try {
      const { document } = await api.patch(`/documents/${doc.key}`, { body });
      onSaved(document);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dk-card" style={{ padding: 16, marginBottom: 12 }}>
      <div className="dk-eyebrow" style={{ marginBottom: 8 }}>{doc.title}</div>
      <textarea className="dk-textarea" style={{ minHeight: 80 }} value={body} onChange={(e) => setBody(e.target.value)} />
      {dirty && (
        <div style={{ marginTop: 8 }}>
          <button className="dk-btn" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
        </div>
      )}
    </div>
  );
}

export default function Documents() {
  const [docs, setDocs] = useState(null);

  const load = () => api.get("/documents").then(({ documents }) => setDocs(documents));
  useEffect(() => { load(); }, []);

  const onSaved = (updated) => setDocs((ds) => ds.map((d) => (d.key === updated.key ? updated : d)));

  if (!docs) return <Spinner />;
  const usp = docs.find((d) => d.key === "usp");
  const terms = docs.filter((d) => d.key !== "usp");

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 className="serif" style={{ fontSize: 26, fontWeight: 600, marginBottom: 4 }}>Documents</h1>
      <div style={{ fontSize: 13, color: "var(--mut)", marginBottom: 16 }}>Edits appear immediately in the client app's "More" tab.</div>

      {usp && <div style={{ marginBottom: 16 }}><UspEditor doc={usp} onSaved={onSaved} /></div>}
      {terms.map((d) => <DocEditor key={d.key} doc={d} onSaved={onSaved} />)}
    </div>
  );
}
