import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, resolveMediaUrl } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Avatar } from "../shared/ui.jsx";
import { formatTime } from "../shared/format.js";

const POLL_MS = 5000;

export default function Chat({ project }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [msgs, setMsgs] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => api.get(`/projects/${project.id}/messages`).then(({ messages }) => { if (!cancelled) setMsgs(messages); });
    load();
    const t = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, [project.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [msgs?.length]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const { message } = await api.post(`/projects/${project.id}/messages`, { text: text.trim() });
      setMsgs((m) => [...m, message]);
      setText("");
    } catch (err) {
      setError(err.message || "Message failed to send");
    } finally {
      setSending(false);
    }
  };

  const attach = () => fileRef.current?.click();
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const { filePath } = await api.post("/uploads", form, { isForm: true });
      const { message } = await api.post(`/projects/${project.id}/messages`, { attachmentPath: filePath, text: `Shared a reference design: ${file.name}` });
      setMsgs((m) => [...m, message]);
    } catch (err) {
      setError(err.message || "Could not upload attachment");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
        <button className="ca-btn ghost" onClick={() => navigate(-1)} style={{ padding: "6px 10px" }}>←</button>
        <Avatar name="Decoory Team" size={34} />
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Decoory Team</div>
          <div style={{ fontSize: 11, color: "var(--ok)", fontWeight: 600 }}>● Online · replies in ~10 min</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
        {msgs === null && <div style={{ fontSize: 12.5, color: "var(--mut)", textAlign: "center", marginTop: 20 }}>Loading…</div>}
        {msgs?.map((m) => {
          const mine = m.senderUserId === user.id;
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 10 }}>
              <div style={{
                maxWidth: "78%", background: mine ? "var(--ink)" : "#fff", color: mine ? "#fff" : "var(--ink)",
                border: mine ? "none" : "1px solid var(--line)",
                borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px", padding: "9px 12px",
              }}>
                {m.senderLabel && <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--brass)", marginBottom: 2 }}>{m.senderLabel}</div>}
                {m.text && <div style={{ fontSize: 13, lineHeight: 1.45 }}>{m.text}</div>}
                {m.attachmentPath && (
                  <a href={resolveMediaUrl(m.attachmentPath)} target="_blank" rel="noreferrer" style={{ color: "inherit", fontSize: 12, textDecoration: "underline", display: "block", marginTop: 4 }}>
                    📎 View attachment
                  </a>
                )}
                <div style={{ fontSize: 9.5, opacity: 0.6, marginTop: 3, textAlign: "right" }}>{formatTime(m.createdAt)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <div style={{ fontSize: 12, color: "var(--bad)", marginBottom: 6 }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={onFile} />
        <button className="ca-btn ghost" title="Upload a reference design" style={{ padding: "8px 11px" }} onClick={attach}>📎</button>
        <input
          className="ca-input" style={{ flex: 1 }} value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message or share a design idea…"
        />
        <button className="ca-btn" style={{ width: "auto", padding: "8px 14px" }} onClick={send} disabled={sending}>Send</button>
      </div>
    </div>
  );
}
