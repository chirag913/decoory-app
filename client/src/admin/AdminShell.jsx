import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import Overview from "./Overview.jsx";
import Projects from "./Projects.jsx";
import ProjectDetail from "./ProjectDetail.jsx";
import Payments from "./Payments.jsx";
import Leads from "./Leads.jsx";
import Clients from "./Clients.jsx";
import Workforce from "./Workforce.jsx";
import AdminChat from "./AdminChat.jsx";
import Documents from "./Documents.jsx";
import Reports from "./Reports.jsx";

const NAV = [
  [".", "◧", "Overview"],
  ["projects", "▤", "Projects"],
  ["payments", "₹", "Payments"],
  ["leads", "◎", "Leads"],
  ["clients", "☺", "Clients"],
  ["team", "⚒", "Workforce"],
  ["documents", "▦", "Documents"],
  ["reports", "▨", "Reports"],
];

export default function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="dk-root">
      <aside className="dk-side">
        <div style={{ padding: "4px 12px 22px" }}>
          <div className="serif" style={{ fontSize: 19, fontWeight: 600, letterSpacing: ".01em" }}>
            Decoory<span style={{ color: "var(--brass)" }}>.</span>
          </div>
          <div className="lbl" style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "#8E8A7C", marginTop: 2 }}>
            Interior's · Admin
          </div>
        </div>
        {NAV.map(([path, icon, label]) => (
          <NavLink key={label} to={path} end={path === "."} className={({ isActive }) => `dk-nav ${isActive ? "on" : ""}`}>
            <span style={{ width: 18, textAlign: "center" }}>{icon}</span><span className="lbl">{label}</span>
          </NavLink>
        ))}
        <div className="lbl" style={{ marginTop: "auto", padding: "14px 12px", fontSize: 11, color: "#8E8A7C", lineHeight: 1.6, borderTop: "1px solid #333B35" }}>
          {user.name}<br />
          <span onClick={() => { logout(); navigate("/login"); }} style={{ cursor: "pointer", color: "#C9C5B6", textDecoration: "underline" }}>Sign out</span>
        </div>
      </aside>
      <main className="dk-main">
        <Routes>
          <Route index element={<Overview />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="payments" element={<Payments />} />
          <Route path="leads" element={<Leads />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:projectId/chat" element={<AdminChat />} />
          <Route path="team" element={<Workforce />} />
          <Route path="documents" element={<Documents />} />
          <Route path="reports" element={<Reports />} />
        </Routes>
      </main>
    </div>
  );
}
