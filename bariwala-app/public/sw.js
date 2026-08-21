// Minimal service worker. This app is data-heavy and dynamic (bills, payments),
// so we deliberately do NOT cache pages or API responses — caching stale billing
// data would be actively harmful. This file exists mainly to satisfy the
// "installable PWA" requirement (a fetch handler + registered service worker).
const CACHE_NAME = "house-mgmt-shell-v1";
const SHELL_ASSETS = ["/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Network-first for everything; only fall back to cache for the couple of
  // static icon assets we precached, and only if the network genuinely fails
  // (e.g. briefly offline) — never serve cached HTML or API data.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
