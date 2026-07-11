import { useEffect } from "react";

// Full-screen viewer for a daily update's photo/video gallery.
export default function PhotoViewer({ media, index, onClose, onNav }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNav(1);
      if (e.key === "ArrowLeft") onNav(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNav]);

  const m = media[index];
  if (!m) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,17,15,.94)", zIndex: 1000,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{ position: "absolute", top: 16, right: 20, color: "#fff", fontSize: 22, cursor: "pointer" }} onClick={onClose}>✕</div>
      <div style={{ position: "absolute", top: 16, left: 20, color: "#C9C5B6", fontSize: 12.5 }}>{index + 1} / {media.length}</div>

      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "94vw", maxHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {m.placeholder ? (
          <div style={{
            width: "min(90vw, 480px)", height: "min(60vh, 480px)", borderRadius: 14,
            background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})`,
            display: "flex", alignItems: "flex-end", padding: 20, color: "#fff", fontSize: 15, fontWeight: 600,
          }}>
            {m.caption}
          </div>
        ) : m.kind === "video" ? (
          <video src={m.url} controls autoPlay style={{ maxWidth: "100%", maxHeight: "78vh", borderRadius: 12 }} />
        ) : (
          <img src={m.url} alt="" style={{ maxWidth: "100%", maxHeight: "78vh", borderRadius: 12, objectFit: "contain" }} />
        )}
      </div>

      {media.length > 1 && (
        <div style={{ display: "flex", gap: 24, marginTop: 18 }} onClick={(e) => e.stopPropagation()}>
          <button className="ca-btn ghost" style={{ color: "#fff", borderColor: "#555" }} onClick={() => onNav(-1)}>← Prev</button>
          <button className="ca-btn ghost" style={{ color: "#fff", borderColor: "#555" }} onClick={() => onNav(1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
