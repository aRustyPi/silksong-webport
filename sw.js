const CACHE_NAME = "hksilksongcache-v3";
const SW_CACHE_NAME = "hksilksong-sw-v1";

const CORE_FILES = [
  "./",
  "./index.html",
  "./jszip.js",
  "./Build/w-pt.loader.js",
  "./TemplateData/style.css"
];

/* =========================
   INSTALL
========================= */

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SW_CACHE_NAME)
      .then(cache => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting())
  );
});

/* =========================
   ACTIVATE
========================= */

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          // Keep the main Silksong cache and this service-worker cache.
          if (
            key !== CACHE_NAME &&
            key !== SW_CACHE_NAME &&
            key.includes("hksilksong")
          ) {
            console.log("[SW] Removing old cache:", key);
            return caches.delete(key);
          }

          return null;
        })
      );
    }).then(() => self.clients.claim())
  );
});

/* =========================
   FETCH
========================= */

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then(response => {

          if (!response || !response.ok) {
            return response;
          }

          // Don't cache special/non-cacheable responses.
          const contentLength = response.headers.get("content-length");

          // Clone before returning the response.
          const clone = response.clone();

          caches.open(SW_CACHE_NAME).then(cache => {
            cache.put(request, clone).catch(() => {});
          });

          return response;
        })
        .catch(() => {
          // Offline navigation fallback.
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }

          return new Response(
            "Offline: this resource has not been cached yet.",
            {
              status: 503,
              headers: {
                "Content-Type": "text/plain"
              }
            }
          );
        });
    })
  );
});
