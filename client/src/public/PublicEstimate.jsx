import { Link } from "react-router-dom";

// Public self-estimation tool — built out in Phase 6.
export default function PublicEstimate() {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="ca-card" style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
        <div className="serif" style={{ fontSize: 22, fontWeight: 600 }}>Free budget estimate</div>
        <p style={{ color: "var(--mut)", fontSize: 13.5 }}>Coming in Phase 6.</p>
        <Link to="/login" style={{ color: "var(--brass)", fontWeight: 600, fontSize: 13 }}>← Back to login</Link>
      </div>
    </div>
  );
}
