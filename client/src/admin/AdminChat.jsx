import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, resolveMediaUrl } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatTime } from "../shared/format.js";
import { Avatar, Spinner } from "../shared/ui.jsx";

const POLL_MS = 5000;

export default function AdminChat() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [msgs, setMsgs] = useState(null);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get(`/projects/${projectId}`).then(({ project }) => setProject(project));
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    const load = () => api.get(`/projects/${projectId}/messages`).then(({ messages }) => { if (!cancelled) setMsgs(messages); });
    load();
    const t = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [projectId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [msgs?.length]);

  const send = async () => {
    if (!text.trim()) return;
    const { message } = await api.post(`/projects/${projectId}/messages`, { text: text.trim() });
    setMsgs((m) => [...m, message]);
    setText("");
  };

  if (!project) return <Spinner />;

  return (
    <div style={{ maxWidth: 640 }}>
      <button className="dk-btn ghost" onClick={() => navigate("../..")} style={{ marginBottom: 14 }}>← Clients</button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <Avatar name={project.client.name} />
        <div>
          <div className="serif" style={{ fontSize: 19, fontWeight: 600 }}>{project.client.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--mut)" }}>{project.name} · {project.code}</div>
        </div>
      </div>

      <div className="dk-card" style={{ height: 480, display: "flex", flexDirection: "column", padding: 16 }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {msgs === null && <Spinner />}
          {msgs?.map((m) => {
            const mine = m.senderUserId === user.id;
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{
                  maxWidth: "78%", background: mine ? "var(--ink)" : "#fff", color: mine ? "#fff" : "var(--ink)",
                  border: mine ? "none" : "1px solid var(--line)",
                  borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "9px 12px",
                }}>
                  {!mine && <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--brass)", marginBottom: 2 }}>{project.client.name}</div>}
                  {m.text && <div style={{ fontSize: 13, lineHeight: 1.45 }}>{m.text}</div>}
                  {m.attachmentPath && (
                    <a href={resolveMediaUrl(m.attachmentPath)} target="_blank" rel="noreferrer" style={{ color: "inherit", fontSize: 12, textDecoration: "underline", display: "block", marginTop: 4 }}>📎 View attachment</a>
                  )}
                  <div style={{ fontSize: 9.5, opacity: 0.6, marginTop: 3, textAlign: "right" }}>{formatTime(m.createdAt)}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
          <input className="dk-input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Reply…" />
          <button className="dk-btn" onClick={send}>Send</button>
        </div>
      </div>
    </div>
  );
}
