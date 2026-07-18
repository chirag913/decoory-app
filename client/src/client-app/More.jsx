import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { SectionTitle, Spinner } from "../shared/ui.jsx";
import { MATERIAL_COLORS } from "../shared/ui.jsx";

export default function More({ project }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [materials, setMaterials] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${project.id}/materials`),
      api.get("/documents"),
    ]).then(([m, d]) => { setMaterials(m.materials); setDocuments(d.documents); });
  }, [project.id]);

  if (!materials || !documents) return <Spinner />;

  const usp = documents.find((d) => d.key === "usp");
  const terms = documents.filter((d) => d.key !== "usp");

  return (
    <div>
      <SectionTitle eyebrow="Materials in your home" title="Brands we're using" />
      {materials.map((b) => (
        <div key={b.id} className="ca-card" style={{ padding: 14, marginBottom: 10, display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, background: MATERIAL_COLORS[b.brand] || "#999", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{b.brand}</div>
            <div style={{ fontSize: 12, color: "var(--mut)" }}>{b.usedFor}</div>
          </div>
          {b.tagline && <span className="ca-chip" style={{ background: "var(--brass-soft)", color: "var(--brass)" }}>{b.tagline}</span>}
        </div>
      ))}

      <div style={{ height: 8 }} />
      <SectionTitle eyebrow="Why Decoory" title="Our promise" />
      <div className="ca-card" style={{ padding: 14, marginBottom: 14 }}>
        {(usp?.body || []).map((u) => (
          <div key={u} style={{ fontSize: 13, padding: "5px 0", display: "flex", gap: 8 }}>
            <span style={{ color: "var(--ok)", fontWeight: 700 }}>✓</span>{u}
          </div>
        ))}
      </div>

      <SectionTitle eyebrow="Documents" title="Terms & policies" />
      {terms.map((t) => (
        <div key={t.key} className="ca-card" style={{ padding: "12px 14px", marginBottom: 8, cursor: "pointer" }} onClick={() => setOpen(open === t.key ? null : t.key)}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 700 }}>
            {t.title}<span style={{ color: "var(--brass)" }}>{open === t.key ? "−" : "+"}</span>
          </div>
          {open === t.key && <div style={{ fontSize: 12.5, color: "var(--mut)", marginTop: 8, lineHeight: 1.6 }}>{t.body}</div>}
        </div>
      ))}

      <div className="ca-card" style={{ padding: 14, marginTop: 14, cursor: "pointer" }} onClick={() => navigate("/app/callback")}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>Request a Callback 📞</div>
        <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 3 }}>Pick a time — your sales consultant or project manager calls you then, no more surprise calls</div>
      </div>

      <div className="ca-card" style={{ padding: 14, margin: "10px 0 14px", background: "var(--ink)", border: "none", color: "#EDEAE0", cursor: "pointer" }} onClick={() => navigate("/app/chat")}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>Need something? Talk to us 💬</div>
        <div style={{ fontSize: 12, color: "#9A968A", marginTop: 3 }}>Chat with your supervisor · share reference designs · raise a change request</div>
      </div>

      <button
        className="ca-btn ghost" style={{ width: "100%", marginBottom: 24 }}
        onClick={() => { logout(); navigate("/login"); }}
      >
        Sign out
      </button>
    </div>
  );
}
