import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { formatINR } from "../shared/format.js";
import { MATERIAL_COLORS } from "../shared/ui.jsx";

const ROOM_TYPES = ["Modular kitchen", "Living room", "Master bedroom", "Full 2BHK", "Full 3BHK", "Full 4BHK+"];

const EMPTY = { name: "", phone: "", city: "", roomType: "", sizeSqft: "", statedBudget: "", stylePreferences: "" };

export default function PublicEstimate() {
  const [form, setForm] = useState(EMPTY);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.roomType) { setError("Please choose a room type"); return; }
    setError("");
    setBusy(true);
    try {
      const { estimate } = await api.post("/estimate", form);
      setResult(estimate);
    } catch (err) {
      setError(err.message || "Could not generate an estimate. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--paper)", display: "flex", justifyContent: "center", padding: "32px 20px" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div className="serif" style={{ fontSize: 24, fontWeight: 600 }}>
            Decoory<span style={{ color: "var(--brass)" }}>.</span>
          </div>
          <div className="ca-eyebrow" style={{ marginTop: 4 }}>Free budget estimate</div>
        </div>

        {!result ? (
          <form onSubmit={submit} className="ca-card" style={{ padding: 22 }}>
            <div className="serif" style={{ fontSize: 19, fontWeight: 600, marginBottom: 4 }}>Tell us about your space</div>
            <div style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 14 }}>
              Takes 30 seconds — get an instant estimate range, material list, brand suggestions and timeline.
            </div>

            <label className="ca-label">Name</label>
            <input className="ca-input" value={form.name} onChange={set("name")} placeholder="Your name" />

            <label className="ca-label">Phone</label>
            <input className="ca-input" value={form.phone} onChange={set("phone")} placeholder="For us to reach you (optional)" />

            <label className="ca-label">City</label>
            <input className="ca-input" value={form.city} onChange={set("city")} placeholder="e.g. Noida, Gurugram, Delhi, Ghaziabad" />

            <label className="ca-label">Room type</label>
            <select className="ca-input" value={form.roomType} onChange={set("roomType")}>
              <option value="">Select…</option>
              {ROOM_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>

            <label className="ca-label">Size (sqft, optional)</label>
            <input className="ca-input" type="number" min="0" value={form.sizeSqft} onChange={set("sizeSqft")} placeholder="e.g. 140" />

            <label className="ca-label">Your budget in mind (₹, optional)</label>
            <input className="ca-input" type="number" min="0" value={form.statedBudget} onChange={set("statedBudget")} placeholder="e.g. 500000" />

            <label className="ca-label">Style preferences (optional)</label>
            <input className="ca-input" value={form.stylePreferences} onChange={set("stylePreferences")} placeholder="e.g. Modern minimal, warm wood tones" />

            {error && <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--bad)" }}>{error}</div>}

            <button className="ca-btn" style={{ marginTop: 18 }} disabled={busy}>{busy ? "Calculating…" : "Get my estimate"}</button>
          </form>
        ) : (
          <div>
            <div className="ca-card" style={{ padding: 22, background: "var(--ink)", color: "#EDEAE0", border: "none", textAlign: "center" }}>
              <div className="ca-eyebrow" style={{ color: "var(--brass)" }}>Estimated budget</div>
              <div className="serif" style={{ fontSize: 30, fontWeight: 600, marginTop: 6 }}>
                {formatINR(result.estimateLowPaise)} – {formatINR(result.estimateHighPaise)}
              </div>
              <div style={{ fontSize: 12, color: "#C9C5B6", marginTop: 6 }}>{form.roomType}{form.city ? ` · ${form.city}` : ""}</div>
            </div>

            <div className="ca-card" style={{ padding: 18, marginTop: 12 }}>
              <div className="ca-eyebrow">Timeline</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4 }}>{result.timeline}</div>
            </div>

            {result.materials?.length > 0 && (
              <div className="ca-card" style={{ padding: 18, marginTop: 12 }}>
                <div className="ca-eyebrow" style={{ marginBottom: 10 }}>Suggested materials</div>
                {result.materials.map((m) => (
                  <div key={m.brand} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0" }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: MATERIAL_COLORS[m.brand] || "#999", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{m.brand}</div>
                      <div style={{ fontSize: 11.5, color: "var(--mut)" }}>{m.usedFor}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="ca-card" style={{ padding: 18, marginTop: 12, textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Like what you see?</div>
              <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 3, marginBottom: 12 }}>
                Our team will reach out shortly. Already a Decoory client?
              </div>
              <Link to="/login"><button className="ca-btn" type="button">Sign in to your project</button></Link>
              <button className="ca-btn ghost" style={{ marginTop: 8 }} onClick={() => { setResult(null); setForm(EMPTY); }}>Start over</button>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--mut)" }}>
          <Link to="/login" style={{ color: "var(--brass)", fontWeight: 600 }}>← Back to login</Link>
        </div>
      </div>
    </div>
  );
}
