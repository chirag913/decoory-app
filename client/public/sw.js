// Minimal service worker — exists only to satisfy the browser's PWA
// installability requirement ("Add to Home Screen" needs an active SW with
// a fetch handler). Deliberately does no caching: this app changes daily
// (admin posts updates, payments, chat), so caching the shell risks
// showing stale data/bundles after a deploy. Network passthrough only.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {}); // no-op: let the browser handle every request normally
