import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function Login() {
  const { loginWithPassword, loginWithPin, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("password"); // password | pin
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate(user.role === "admin" ? "/admin" : "/app", { replace: true });
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const u = mode === "password"
        ? await loginWithPassword(identifier.trim(), password)
        : await loginWithPin(code.trim(), pin.trim());
      navigate(u.role === "admin" ? "/admin" : "/app", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="ca-card" style={{ width: "100%", maxWidth: 380, padding: 26 }}>
        <img src="/decoory-logo.png" alt="Decoory Interior's" style={{ height: 34, marginBottom: 22 }} />

        <div style={{ display: "flex", gap: 6, marginBottom: 18, background: "var(--paper)", borderRadius: 10, padding: 4 }}>
          <button type="button" onClick={() => setMode("password")}
            className="ca-btn" style={{ width: "50%", padding: "8px 0", fontSize: 12.5, background: mode === "password" ? "var(--ink)" : "transparent", color: mode === "password" ? "#fff" : "var(--ink)" }}>
            Email / phone
          </button>
          <button type="button" onClick={() => setMode("pin")}
            className="ca-btn" style={{ width: "50%", padding: "8px 0", fontSize: 12.5, background: mode === "pin" ? "var(--ink)" : "transparent", color: mode === "pin" ? "#fff" : "var(--ink)" }}>
            Project code + PIN
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === "password" ? (
            <>
              <label className="ca-label">Email or phone</label>
              <input className="ca-input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="you@example.com" autoComplete="username" />
              <label className="ca-label">Password</label>
              <input className="ca-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
            </>
          ) : (
            <>
              <label className="ca-label">Project code</label>
              <input className="ca-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DCR-101" />
              <label className="ca-label">PIN</label>
              <input className="ca-input" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Issued at booking" inputMode="numeric" />
            </>
          )}

          {error && <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--bad)" }}>{error}</div>}

          <button className="ca-btn" style={{ marginTop: 18 }} disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--mut)" }}>
          Curious about pricing? <Link to="/estimate" style={{ color: "var(--brass)", fontWeight: 600 }}>Try our free estimate tool →</Link>
        </div>
      </div>
    </div>
  );
}
