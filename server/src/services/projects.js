import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import db from "../db/index.js";

export function nextProjectCode() {
  const nums = db.prepare("SELECT code FROM projects WHERE code LIKE 'DCR-%'").all()
    .map((r) => parseInt(r.code.replace("DCR-", ""), 10))
    .filter((n) => !isNaN(n));
  return `DCR-${(nums.length ? Math.max(...nums) : 100) + 1}`;
}

export function randomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Shared by the manual "+ New project" form (routes/projects.js) and the
// Sales Pipeline's automatic lead→project conversion at "Advance Received"
// (routes/leads.js). Every project needs a client login account, so this
// always creates both in one transaction.
export function createProjectForClient({ code, name, type, budgetPaise, startDate, handoverDate, pin, client, sourceLeadId }) {
  if (!name || !type || !budgetPaise || !client?.name) {
    throw new ApiError(400, "name, type, budgetPaise, and client.name are required");
  }
  if (!client.email && !client.phone) {
    throw new ApiError(400, "client.email or client.phone is required");
  }

  const finalCode = code?.trim().toUpperCase() || nextProjectCode();
  if (db.prepare("SELECT id FROM projects WHERE code = ?").get(finalCode)) {
    throw new ApiError(409, `Project code ${finalCode} is already in use`);
  }
  if (client.email || client.phone) {
    const existing = db.prepare("SELECT id FROM users WHERE email = ? OR phone = ?").get(client.email || "", client.phone || "");
    if (existing) throw new ApiError(409, "That email or phone is already registered to another user");
  }

  const finalPin = pin?.trim() || randomPin();
  const clientPassword = client.password?.trim() || crypto.randomBytes(6).toString("hex");
  const clientUserId = uuid();
  const projectId = uuid();

  const create = db.transaction(() => {
    db.prepare("INSERT INTO users (id, role, name, email, phone, password_hash) VALUES (?, 'client', ?, ?, ?, ?)")
      .run(clientUserId, client.name, client.email || null, client.phone || null, bcrypt.hashSync(clientPassword, 10));
    db.prepare(`
      INSERT INTO projects (id, code, name, type, client_user_id, budget_paise, progress_pct, current_stage, start_date, handover_date, health, today_plan, today_team, pin, source_lead_id)
      VALUES (@id,@code,@name,@type,@clientUserId,@budgetPaise,0,'',@startDate,@handoverDate,'on-track','','',@pin,@sourceLeadId)
    `).run({
      id: projectId, code: finalCode, name, type, clientUserId, budgetPaise,
      startDate: startDate || null, handoverDate: handoverDate || null, pin: finalPin,
      sourceLeadId: sourceLeadId || null,
    });
  });
  create();

  return { project: db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId), clientPassword, pin: finalPin };
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
