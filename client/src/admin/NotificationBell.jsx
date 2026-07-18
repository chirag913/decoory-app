import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { timeAgo } from "../shared/format.js";

const POLL_MS = 20000;

// Resolves a notification to wherever it should navigate — every admin-
// facing notify() call (routes/leads.js, routes/estimate.js,
// routes/projects.js, routes/suggestions.js) uses one of these four types.
function destinationFor(n) {
  if (n.type === "lead" && n.data?.leadId) return `/admin/leads/${n.data.leadId}`;
  if ((n.type === "chat" || n.type === "callback_request") && n.data?.projectId) return `/admin/clients/${n.data.projectId}/chat`;
  if (n.type === "suggestion" && n.data?.projectId) return `/admin/projects/${n.data.projectId}`;
  return null;
}

// Nothing in the admin dashboard previously surfaced the notifications table
// at all — GET /notifications existed and rows were being created (chat
// messages, callback requests, new leads, snoozed-lead wake-ups, client
// interest in a suggestion) but there was no bell, no badge, nothing. This
// is the only place an admin can now discover any of that without
// proactively guessing which client to check.
export default function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  const load = () => api.get("/notifications").then(({ notifications }) => setNotifications(notifications)).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const openNotification = async (n) => {
    if (!n.read) {
      api.patch(`/notifications/${n.id}/read`, {}).catch(() => {});
      setNotifications((ns) => ns.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    setOpen(false);
    const dest = destinationFor(n);
    if (dest) navigate(dest);
  };

  const markAllRead = async () => {
    await api.post("/notifications/read-all", {}).catch(() => {});
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        className="dk-nav" onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", position: "relative", background: open ? "var(--ink2)" : "transparent" }}
      >
        <span style={{ width: 18, textAlign: "center" }}>🔔</span>
        <span className="lbl">Notifications</span>
        {unreadCount > 0 && (
          <span style={{ marginLeft: "auto", background: "var(--bad)", color: "#fff", fontSize: 10.5, fontWeight: 700, borderRadius: 99, padding: "1px 6px" }}>{unreadCount}</span>
        )}
      </button>

      {open && (
        <div
          className="dk-card"
          style={{ position: "absolute", left: "100%", bottom: 0, marginLeft: 8, width: 320, maxHeight: 420, overflowY: "auto", zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,.18)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid var(--line)" }}>
            <b style={{ fontSize: 13 }}>Notifications</b>
            {unreadCount > 0 && <span style={{ fontSize: 11.5, color: "var(--brass)", cursor: "pointer" }} onClick={markAllRead}>Mark all read</span>}
          </div>
          {notifications.length === 0 && <div style={{ padding: 16, fontSize: 12.5, color: "var(--mut)", textAlign: "center" }}>Nothing yet.</div>}
          {notifications.slice(0, 25).map((n) => (
            <div
              key={n.id} className="dk-row"
              style={{ padding: "10px 12px", borderBottom: "1px solid var(--line)", cursor: "pointer", background: n.read ? "transparent" : "#FBFAF6" }}
              onClick={() => openNotification(n)}
            >
              <div style={{ fontSize: 12.5, fontWeight: n.read ? 500 : 700, color: "var(--ink)" }}>{n.title}</div>
              <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 2 }}>{n.body}</div>
              <div style={{ fontSize: 10.5, color: "var(--mut)", marginTop: 3 }}>{timeAgo(n.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
