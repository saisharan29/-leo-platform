/* Léo service worker — offline shell + downloadable lesson packs. */
const VERSION = "leo-v1";
const SHELL = `${VERSION}-shell`;
const PACKS = `${VERSION}-packs`;
const PAGES = `${VERSION}-pages`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(["/offline", "/manifest.webmanifest"])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

// Message API: cache a full lesson pack (page HTML + content + exercises).
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "CACHE_LESSON" || !Number.isInteger(data.number)) return;
  const n = data.number;
  const urls = [`/lesson/${n}`, `/api/lessons/${n}`, `/api/lessons/${n}/exercises?seed=offline`];
  event.waitUntil(
    caches.open(PACKS).then(async (cache) => {
      const results = await Promise.all(
        urls.map(async (u) => {
          try {
            const res = await fetch(u, { credentials: "include" });
            if (res.ok) { await cache.put(u, res.clone()); return true; }
            return false;
          } catch { return false; }
        }),
      );
      const ok = results.every(Boolean);
      const clients = await self.clients.matchAll();
      for (const client of clients) client.postMessage({ type: "LESSON_CACHED", number: n, ok });
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Static build assets: cache-first (immutable by content hash)
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(SHELL).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Lesson APIs: network-first, fall back to downloaded pack
  if (url.pathname.startsWith("/api/lessons/")) {
    event.respondWith(
      fetch(req)
        .then((res) => res)
        .catch(async () => {
          const cache = await caches.open(PACKS);
          // exercises: any cached seed beats nothing offline
          const exact = await cache.match(req);
          if (exact) return exact;
          if (url.pathname.endsWith("/exercises"))
            return (await cache.match(`${url.pathname}?seed=offline`)) ?? Response.error();
          return Response.error();
        }),
    );
    return;
  }

  // Other API calls: network only (never serve stale progress data)
  if (url.pathname.startsWith("/api/")) return;

  // Page navigations: network-first → cached page → cached pack page → /offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(async (res) => {
          if (res.ok) (await caches.open(PAGES)).put(req, res.clone());
          return res;
        })
        .catch(async () => {
          return (
            (await caches.match(req)) ??
            (await (await caches.open(PACKS)).match(url.pathname)) ??
            (await caches.match("/offline")) ??
            Response.error()
          );
        }),
    );
  }
});
