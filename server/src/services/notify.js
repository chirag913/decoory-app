import { v4 as uuid } from "uuid";
import db from "../db/index.js";

// Creates an in-app notification. Delivery is in-app only (bell icon +
// the client's own polling) — no push, since the client is a PWA with
// no way to register a device token for background delivery.
export function notify(userId, { title, body, type, data }) {
  const id = uuid();
  db.prepare(
    "INSERT INTO notifications (id, user_id, title, body, type, data) VALUES (?,?,?,?,?,?)"
  ).run(id, userId, title, body, type, data ? JSON.stringify(data) : null);
  return id;
}

export function notifyAllAdmins({ title, body, type, data }) {
  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
  for (const a of admins) notify(a.id, { title, body, type, data });
}
