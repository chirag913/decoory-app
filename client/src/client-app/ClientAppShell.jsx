import { useCallback, useEffect, useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Spinner } from "../shared/ui.jsx";
import { registerPushNotifications } from "../shared/push.js";
import Home from "./Home.jsx";
import Updates from "./Updates.jsx";
import Payments from "./Payments.jsx";
import Team from "./Team.jsx";
import More from "./More.jsx";
import Chat from "./Chat.jsx";

const TABS = [
  [".", "⌂", "Home"],
  ["updates", "▤", "Updates"],
  ["payments", "₹", "Payments"],
  ["team", "☺", "Team"],
  ["more", "≡", "More"],
];

export default function ClientAppShell() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");

  const reloadProject = useCallback(async () => {
    try {
      const { project } = await api.get("/projects/me");
      setProject(project);
    } catch (err) {
      setError(err.message || "Could not load your project");
    }
  }, []);

  useEffect(() => { reloadProject(); }, [reloadProject]);
  useEffect(() => { registerPushNotifications().catch((e) => console.error("Push setup failed:", e.message)); }, []);

  if (error) {
    return (
      <div className="ca-shell" style={{ alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 13.5, color: "var(--bad)", marginBottom: 14 }}>{error}</div>
        <button className="ca-btn" style={{ width: "auto", padding: "8px 16px" }} onClick={() => { logout(); navigate("/login"); }}>Sign out</button>
      </div>
    );
  }
  if (!project) return <div className="ca-shell"><Spinner /></div>;

  return (
    <div className="ca-shell">
      <div className="ca-body">
        <Routes>
          <Route index element={<Home project={project} onProjectChange={reloadProject} />} />
          <Route path="updates" element={<Updates project={project} />} />
          <Route path="payments" element={<Payments project={project} />} />
          <Route path="team" element={<Team project={project} />} />
          <Route path="more" element={<More project={project} />} />
          <Route path="chat" element={<Chat project={project} />} />
        </Routes>
      </div>
      <nav className="ca-tabbar">
        {TABS.map(([path, icon, label]) => (
          <NavLink key={label} to={path} end={path === "."} className={({ isActive }) => `ca-tab ${isActive ? "on" : ""}`}>
            <span className="ico">{icon}</span>{label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
