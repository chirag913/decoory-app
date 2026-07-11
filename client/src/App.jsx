import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import Login from "./auth/Login.jsx";
import ClientAppShell from "./client-app/ClientAppShell.jsx";
import AdminShell from "./admin/AdminShell.jsx";
import PublicEstimate from "./public/PublicEstimate.jsx";
import { Spinner } from "./shared/ui.jsx";

function Protected({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === "admin" ? "/admin" : "/app"} replace />;
  return children;
}

function Root() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/admin" : "/app"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/login" element={<Login />} />
          <Route path="/estimate" element={<PublicEstimate />} />
          <Route path="/app/*" element={<Protected role="client"><ClientAppShell /></Protected>} />
          <Route path="/admin/*" element={<Protected role="admin"><AdminShell /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
