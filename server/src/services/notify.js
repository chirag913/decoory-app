import { v4 as uuid } from "uuid";
import db from "../db/index.js";
import { sendPushToUser } from "./push.js";

// Creates an in-app notification and fires a Firebase push alongside it
// (push is fire-and-forget and silently no-ops without FCM configured —
// callers never need to await or branch on whether push succeeded).
export function notify(userId, { title, body, type, data }) {
  const id = uuid();
  db.prepare(
    "INSERT INTO notifications (id, user_id, title, body, type, data) VALUES (?,?,?,?,?,?)"
  ).run(id, userId, title, body, type, data ? JSON.stringify(data) : null);
  sendPushToUser(userId, { title, body, data: { ...data, type, notificationId: id } })
    .catch((e) => console.error("Push delivery failed:", e.message));
  return id;
}

export function notifyAllAdmins({ title, body, type, data }) {
  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
  for (const a of admins) notify(a.id, { title, body, type, data });
}
