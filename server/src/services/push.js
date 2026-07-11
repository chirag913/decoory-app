import admin from "firebase-admin";
import db from "../db/index.js";

let app = null;
if (process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY) {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FCM_PROJECT_ID,
      clientEmail: process.env.FCM_CLIENT_EMAIL,
      privateKey: process.env.FCM_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

export const isPushConfigured = !!app;

// Pushes to every device token registered for a user (a user may be signed
// in on more than one device). Silently no-ops when FCM isn't configured —
// in-app notifications (services/notify.js) always fire regardless.
export async function sendPushToUser(userId, { title, body, data }) {
  if (!app) return { sent: 0 };
  const tokens = db.prepare("SELECT token FROM push_tokens WHERE user_id = ?").all(userId).map((r) => r.token);
  if (tokens.length === 0) return { sent: 0 };

  const stringData = Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, String(v)]));
  try {
    const res = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: stringData,
    });
    pruneDeadTokens(tokens, res.responses);
    return { sent: res.successCount };
  } catch (e) {
    console.error("FCM push failed:", e.message);
    return { sent: 0, error: e.message };
  }
}

// Devices get uninstalled/tokens expire — FCM tells us which ones via
// 'registration-token-not-registered', so we stop trying to push to them.
function pruneDeadTokens(tokens, responses) {
  const dead = tokens.filter((_, i) => responses[i].error?.code === "messaging/registration-token-not-registered");
  if (dead.length === 0) return;
  const del = db.prepare("DELETE FROM push_tokens WHERE token = ?");
  for (const t of dead) del.run(t);
}
