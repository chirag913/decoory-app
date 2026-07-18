import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import Overview from "./Overview.jsx";
import SalesPipelinePage from "./SalesPipelinePage.jsx";
import ProjectsGrid from "./ProjectsGrid.jsx";
import ProjectDetail from "./ProjectDetail.jsx";
import Payments from "./Payments.jsx";
import LeadDetail from "./LeadDetail.jsx";
import Clients from "./Clients.jsx";
import Workforce from "./Workforce.jsx";
import AdminChat from "./AdminChat.jsx";
import Documents from "./Documents.jsx";
import Reports from "./Reports.jsx";
import Calendar from "./Calendar.jsx";
import NotificationBell from "./NotificationBell.jsx";

// Architecture: Sales Pipeline (leads, pre-advance) and Projects (execution,
// post-advance) are deliberately separate top-level sections now, not tabs
// of one page — see SalesPipelinePage.jsx / ProjectsGrid.jsx. Conversion
// from a lead to a project still happens the same way it always has (Sales
// Pipeline reaching "Advance Received", services/projects.js) — this split
// is navigation/architecture only, no conversion behavior changed.
const NAV = [
  [".", "◧", "Dashboard"],
  ["sales-pipeline", "◎", "Sales Pipeline"],
  ["projects", "▤", "Projects"],
  ["calendar", "▧", "Calendar"],
  ["clients", "☺", "Customers"],
  ["payments", "₹", "Payments"],
  ["team", "⚒", "Team"],
  ["documents", "❐", "Documents"],
  ["reports", "▨", "Reports"],
];

export default function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="dk-root">
      <aside className="dk-side">
        <div style={{ padding: "8px 12px 22px" }}>
          <div style={{ background: "var(--paper)", borderRadius: 8, padding: "9px 10px", display: "inline-block", maxWidth: "100%" }}>
            <img src="/decoory-logo.png" alt="Decoory Interior's" style={{ width: "100%", maxWidth: 150, height: "auto", display: "block" }} />
          </div>
          <div className="lbl" style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "#8E8A7C", marginTop: 8 }}>
            Admin
          </div>
        </div>
        <NotificationBell />
        <div style={{ height: 1, background: "#333B35", margin: "8px 12px" }} />
        {NAV.map(([path, icon, label]) => (
          <NavLink key={label} to={path} end={path === "."} className={({ isActive }) => `dk-nav ${isActive ? "on" : ""}`}>
            <span style={{ width: 18, textAlign: "center" }}>{icon}</span><span className="lbl">{label}</span>
          </NavLink>
        ))}
        <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid #333B35" }}>
          <div className="lbl" style={{ fontSize: 11, color: "#8E8A7C", padding: "4px 12px 8px" }}>{user.name}</div>
          <button className="dk-nav" onClick={() => { logout(); navigate("/login"); }} title="Sign out" style={{ color: "#C9C5B6" }}>
            <span style={{ width: 18, textAlign: "center" }}>⏻</span><span className="lbl">Sign out</span>
          </button>
        </div>
      </aside>
      <main className="dk-main">
        <Routes>
          <Route index element={<Overview />} />
          <Route path="sales-pipeline" element={<SalesPipelinePage />} />
          <Route path="projects" element={<ProjectsGrid />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="payments" element={<Payments />} />
          <Route path="leads/:id" element={<LeadDetail />} />
          <Route path="calendar" element={<Calendar />} />
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
