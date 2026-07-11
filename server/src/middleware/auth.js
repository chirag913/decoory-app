import { verifyToken } from "../utils/jwt.js";
import db from "../db/index.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token" });
  try {
    const payload = verifyToken(token);
    const user = db.prepare("SELECT id, role, name, email, phone FROM users WHERE id = ?").get(payload.sub);
    if (!user) return res.status(401).json({ error: "User no longer exists" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// For client-scoped routes: attaches req.project (the caller's own project)
// and 404s if the client tries to touch a project that isn't theirs.
export function loadOwnProject(req, res, next) {
  const project = db.prepare("SELECT * FROM projects WHERE client_user_id = ?").get(req.user.id);
  if (!project) return res.status(404).json({ error: "No project found for this account" });
  req.project = project;
  next();
}
