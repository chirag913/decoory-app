import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { formatDate } from "../shared/format.js";
import { Photo, SectionTitle, Spinner } from "../shared/ui.jsx";
import PhotoViewer from "./PhotoViewer.jsx";

export default function Updates({ project }) {
  const [updates, setUpdates] = useState(null);
  const [viewer, setViewer] = useState(null); // { media, index }

  useEffect(() => {
    api.get(`/projects/${project.id}/updates`).then(({ updates }) => setUpdates(updates));
  }, [project.id]);

  if (!updates) return <Spinner />;

  return (
    <div>
      <SectionTitle eyebrow="Progress history" title="Daily site updates" />
      {updates.length === 0 && <div style={{ fontSize: 13, color: "var(--mut)" }}>No updates posted yet.</div>}
      {updates.map((u, i) => (
        <div key={u.id} className="ca-card" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b style={{ fontSize: 13.5 }}>{formatDate(u.date)}</b>
            {i === 0 && <span className="ca-chip" style={{ background: "var(--brass-soft)", color: "var(--brass)" }}>Latest</span>}
          </div>
          <ul style={{ margin: "8px 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
            {u.items.map((it, idx) => <li key={idx}>{it}</li>)}
          </ul>
          {u.media.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {u.media.map((m, idx) => (
                <div key={m.id} style={{ flex: "1 1 90px", maxWidth: 120 }}>
                  <Photo media={m} onClick={() => setViewer({ media: u.media, index: idx })} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: "var(--mut)", textAlign: "center", padding: "4px 0 14px" }}>
        You get a notification the moment a new update is posted.
      </div>

      {viewer && (
        <PhotoViewer
          media={viewer.media}
          index={viewer.index}
          onClose={() => setViewer(null)}
          onNav={(dir) => setViewer((v) => ({ ...v, index: (v.index + dir + v.media.length) % v.media.length }))}
        />
      )}
    </div>
  );
}
