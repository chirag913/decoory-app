import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { api } from "../api/client.js";

// Registers this device for FCM push once the user is signed in. No-ops
// entirely in a browser tab (Capacitor.isNativePlatform() is false there) —
// the web app relies on in-app notifications + polling, same as always.
export async function registerPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  const permission = await PushNotifications.checkPermissions();
  if (permission.receive !== "granted") {
    const requested = await PushNotifications.requestPermissions();
    if (requested.receive !== "granted") return;
  }

  await PushNotifications.register();

  PushNotifications.addListener("registration", (token) => {
    api.post("/push-tokens", { token: token.value, platform: "android" }).catch((e) => console.error("Push token registration failed:", e.message));
  });
  PushNotifications.addListener("registrationError", (err) => {
    console.error("Push registration error:", err.error);
  });
}

export async function unregisterPushNotifications(token) {
  if (!Capacitor.isNativePlatform() || !token) return;
  await api.del(`/push-tokens/${token}`).catch(() => {});
}
