/* NEN1090 PWA Service Worker (simple offline cache) */
const CACHE_NAME = "nen1090-pwa-v1";
const CORE_ASSETS = [
  "/", "/index.html", "/start.html",
  "/css/theme.css",
  "/manifest.webmanifest",
  "/icons/icon-192.png", "/icons/icon-512.png",
  "/icons/icon-192-maskable.png", "/icons/icon-512-maskable.png",
  "/js/core/store.js",
  "/js/core/permissions.js",
  "/js/core/ui.js",
  "/js/core/apps_menu.js",
  "/js/core/export.js",
  "/js/core/auth_client.js",
  "/js/core/shell.js",
  "/js/core/router.js",
  "/js/core/rpc.js",
  "/js/core/zip.js",
  "/js/core/config.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never cache non-GET
  if (req.method !== "GET") return;

  // Don't cache API calls (proxy/functions); pass through
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // try cache first
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      // cache same-origin successful responses (basic, opaque ok)
      if (fresh && (fresh.status === 200 || fresh.type === "opaque") && url.origin === self.location.origin) {
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (e) {
      // offline fallback
      if (url.pathname.startsWith("/layers/")) {
        const fallback = await cache.match("/start.html");
        if (fallback) return fallback;
      }
      const home = await cache.match("/start.html");
      return home || new Response("Offline", { status: 503, headers: { "Content-Type":"text/plain" }});
    }
  })());
});
