import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import db from "../db/index.js";
import { signToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function publicUser(u) {
  return { id: u.id, role: u.role, name: u.name, email: u.email, phone: u.phone };
}

// Email/phone + password login (admin or client)
router.post("/login", (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: "identifier and password are required" });

  const user = db.prepare("SELECT * FROM users WHERE email = ? OR phone = ?").get(identifier, identifier);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = signToken({ sub: user.id, role: user.role });
  res.json({ token, user: publicUser(user) });
});

// Project code + PIN login (client only)
router.post("/login-pin", (req, res) => {
  const { code, pin } = req.body;
  if (!code || !pin) return res.status(400).json({ error: "code and pin are required" });

  const project = db.prepare("SELECT * FROM projects WHERE code = ?").get(code.trim().toUpperCase());
  if (!project || project.pin !== pin) return res.status(401).json({ error: "Invalid project code or PIN" });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(project.client_user_id);
  const token = signToken({ sub: user.id, role: user.role });
  res.json({ token, user: publicUser(user) });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Admin-only: register a new client user for onboarding a fresh project.
router.post("/register-client", requireAuth, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { name, email, phone, password } = req.body;
  if (!name || !password || (!email && !phone)) {
    return res.status(400).json({ error: "name, password, and email or phone are required" });
  }
  const id = uuid();
  const password_hash = bcrypt.hashSync(password, 10);
  try {
    db.prepare("INSERT INTO users (id, role, name, email, phone, password_hash) VALUES (?, 'client', ?, ?, ?, ?)")
      .run(id, name, email || null, phone || null, password_hash);
  } catch {
    return res.status(409).json({ error: "Email or phone already in use" });
  }
  res.status(201).json({ user: { id, role: "client", name, email, phone } });
});

export default router;
