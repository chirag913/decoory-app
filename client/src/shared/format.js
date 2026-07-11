// Mirrors server/src/utils/money.js — kept as a small, separately-duplicated
// pure function since client and server don't share a package boundary.
export function formatINR(paise) {
  if (paise == null) return "—";
  const rupees = paise / 100;
  const abs = Math.abs(rupees);
  let out;
  if (abs >= 1e7) out = `₹${trim((rupees / 1e7).toFixed(2))}Cr`;
  else if (abs >= 1e5) out = `₹${trim((rupees / 1e5).toFixed(2))}L`;
  else out = `₹${rupees.toLocaleString("en-IN")}`;
  return out;
}
function trim(numStr) {
  return numStr.endsWith("0") ? numStr.slice(0, -1) : numStr;
}

export function formatDate(dateStr, opts = {}) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", ...opts });
}

export function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const ms = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

export function initials(name) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function greetingEmoji() {
  const hour = new Date().getHours();
  if (hour < 12) return "☀️";
  if (hour < 17) return "🌤️";
  return "🌙";
}
