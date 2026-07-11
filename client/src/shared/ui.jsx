import { initials } from "./format.js";

export const STATUS_STYLE = {
  paid: { bg: "#E4EFE8", fg: "#3E7A5B", label: "Paid ✓" },
  due: { bg: "#F6ECD8", fg: "#A8741A", label: "Due" },
  upcoming: { bg: "#F6ECD8", fg: "#A8741A", label: "Upcoming" },
  overdue: { bg: "#F6E0DA", fg: "#B3452E", label: "Overdue" },
  scheduled: { bg: "#ECEAE2", fg: "#6E6A5E", label: "Scheduled" },
  "on-track": { bg: "#E4EFE8", fg: "#3E7A5B", label: "On track" },
  attention: { bg: "#F6ECD8", fg: "#A8741A", label: "Needs attention" },
  new: { bg: "#EAE4F2", fg: "#6B4FA1", label: "New" },
  contacted: { bg: "#F6ECD8", fg: "#A8741A", label: "Contacted" },
  qualified: { bg: "#E4EFE8", fg: "#3E7A5B", label: "Qualified" },
  sent: { bg: "#ECEAE2", fg: "#6E6A5E", label: "Sent" },
  interested: { bg: "#E4EFE8", fg: "#3E7A5B", label: "Interested" },
  dismissed: { bg: "#ECEAE2", fg: "#6E6A5E", label: "Maybe later" },
};

export const MATERIAL_COLORS = {
  "Century Ply": "#8A5A33", "Action TESA": "#B98A54", "Hafele": "#9BA1A6",
  "Hettich": "#5E6B73", "Virgo": "#C9B18C", "Kwalit": "#4C4A45",
};

export function Chip({ status, label, size = "dk" }) {
  const t = STATUS_STYLE[status] || STATUS_STYLE.scheduled;
  const cls = size === "ca" ? "ca-chip" : "dk-chip";
  return <span className={cls} style={{ background: t.bg, color: t.fg }}>{label || t.label}</span>;
}

export function Avatar({ name, size = 34 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%", background: "var(--brass-soft)", color: "var(--brass)",
      display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
      fontSize: size / 2.8, flexShrink: 0,
    }}>
      {initials(name || "?")}
    </span>
  );
}

export function Bar({ v, height = 6 }) {
  return (
    <div style={{ background: "#ECE9DF", borderRadius: 99, height, width: "100%" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, v))}%`, height, borderRadius: 99, background: "var(--brass)" }} />
    </div>
  );
}

export function Swatches({ mats = [] }) {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }} title={mats.join(", ")}>
      {mats.map((m) => <span key={m} className="dk-swatch" style={{ background: MATERIAL_COLORS[m] || "#999" }} />)}
    </span>
  );
}

// Media tile: renders the seeded gradient placeholder or a real uploaded
// photo/video, depending on what the API returned (see server README).
export function Photo({ media, onClick, height = 84 }) {
  if (media.placeholder) {
    const [c1, c2] = media.colors;
    return (
      <div className="ca-photo" style={{ height, background: `linear-gradient(135deg, ${c1}, ${c2})` }} onClick={onClick}>
        {media.caption}
      </div>
    );
  }
  if (media.kind === "video") {
    return (
      <video src={media.url} controls style={{ height, borderRadius: 10, flex: 1, minWidth: 0, background: "#000" }} onClick={onClick} />
    );
  }
  return (
    <img src={media.url} alt="" style={{ height, borderRadius: 10, flex: 1, minWidth: 0, objectFit: "cover", cursor: onClick ? "pointer" : "default" }} onClick={onClick} />
  );
}

export function SectionTitle({ eyebrow, title }) {
  return (
    <div style={{ margin: "4px 2px 12px" }}>
      <div className="ca-eyebrow">{eyebrow}</div>
      <div className="serif" style={{ fontSize: 21, fontWeight: 600, marginTop: 2 }}>{title}</div>
    </div>
  );
}

export function Spinner() {
  return <div style={{ padding: 40, textAlign: "center", color: "var(--mut)", fontSize: 13 }}>Loading…</div>;
}

export function ErrorNote({ children }) {
  return <div style={{ padding: 12, background: "#F6E0DA", color: "#B3452E", borderRadius: 10, fontSize: 12.5, margin: "8px 0" }}>{children}</div>;
}
