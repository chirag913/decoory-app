import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client.js";
import { formatDate } from "../../shared/format.js";
import { Photo, Spinner } from "../../shared/ui.jsx";

export default function UpdatesTab({ project }) {
  const [updates, setUpdates] = useState(null);
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const load = () => api.get(`/projects/${project.id}/updates`).then(({ updates }) => setUpdates(updates));
  useEffect(() => { load(); }, [project.id]);

  const publish = async () => {
    const items = text.split("\n").map((s) => s.trim()).filter(Boolean);
    if (items.length === 0) return;
    setPublishing(true);
    setError("");
    try {
      // Media upload wires up in Phase 4 (Multer -> Supabase Storage/local disk);
      // for now the update itself publishes immediately without attachments.
      let media = [];
      if (files.length > 0) {
        try {
          media = await Promise.all(files.map(async (file) => {
            const form = new FormData();
            form.append("file", file);
            const { filePath, kind } = await api.post("/uploads", form, { isForm: true });
            return { filePath, kind };
          }));
        } catch {
          setError("Update will publish without photos — file upload isn't available yet.");
        }
      }
      await api.post(`/projects/${project.id}/updates`, { date: new Date().toISOString().slice(0, 10), items, media });
      setText("");
      setFiles([]);
      load();
    } finally {
      setPublishing(false);
    }
  };

  if (!updates) return <Spinner />;

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="dk-card" style={{ padding: 16, marginBottom: 18, background: "#FBFAF6" }}>
        <div className="dk-eyebrow" style={{ marginBottom: 8 }}>Post today's update</div>
        <textarea
          className="dk-textarea" value={text} onChange={(e) => setText(e.target.value)}
          placeholder="What happened on site today? One line per item…"
        />
        {files.length > 0 && <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 6 }}>{files.length} file(s) attached</div>}
        {error && <div style={{ fontSize: 12, color: "var(--warn)", marginTop: 6 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          <button className="dk-btn ghost" onClick={() => fileRef.current?.click()}>Attach photos</button>
          <button className="dk-btn" disabled={publishing || !text.trim()} onClick={publish}>
            {publishing ? "Publishing…" : "Publish update — client gets notified"}
          </button>
        </div>
      </div>

      {updates.map((u) => (
        <div key={u.id} style={{ display: "flex", gap: 14, marginBottom: 4 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--brass)", marginTop: 5 }} />
            <span style={{ width: 1, flex: 1, background: "var(--line)" }} />
          </div>
          <div style={{ paddingBottom: 18, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{formatDate(u.date)}</div>
            <ul style={{ margin: "6px 0", paddingLeft: 18, fontSize: 13.5, lineHeight: 1.55 }}>
              {u.items.map((it, i) => <li key={i}>{it}</li>)}
            </ul>
            {u.media.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                {u.media.map((m) => <div key={m.id} style={{ flex: "1 1 90px", maxWidth: 110 }}><Photo media={m} height={64} /></div>)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
