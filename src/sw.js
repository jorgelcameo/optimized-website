/* Service worker — cache-first after first request.
 *
 * Cross-origin assets (images served from S3) are precached with mode:"no-cors"
 * and stored as opaque responses. This is deliberate:
 *   - <img> requests are no-cors anyway, so the cached entries match them.
 *   - Cors-mode precaching would race with the page's no-cors <img> loads for
 *     the same URL: whichever response lands in the HTTP cache first wins, and a
 *     cached no-cors response has no Access-Control-Allow-Origin header, so a
 *     later cors fetch of that URL fails with "MissingAllowOriginHeader".
 * Opaque caching sidesteps that entirely and needs no CORS on the bucket.
 *
 * Bump CACHE_VERSION when assets change. */

const CACHE_VERSION = "v6";
const CACHE_NAME = `max-payne-fan-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  "./",
  "index.html",
  "css/styles.css",
  "js/main.js",
  "assets/fonts/max-payne-logo.woff2",
  "assets/fonts/space-grotesk-latin.woff2",
  "assets/images/max-payne-hero-400.webp",
  "assets/images/max-payne-hero-800.webp",
  "assets/images/max-payne-hero-1600.webp",
  "assets/images/max-payne-hero-800.jpg",
  "assets/images/max-payne-hero-1600.jpg",
  "assets/images/max-payne-1-keyart-400.webp",
  "assets/images/max-payne-1-keyart-800.webp",
  "assets/images/max-payne-1-keyart-800.jpg",
  "assets/images/max-payne-2-keyart-400.webp",
  "assets/images/max-payne-2-keyart-800.webp",
  "assets/images/max-payne-2-keyart-800.jpg",
  "assets/images/max-payne-3-keyart-v2-400.webp",
  "assets/images/max-payne-3-keyart-v2-800.webp",
  "assets/images/max-payne-3-keyart-v2-1600.webp",
  "assets/images/max-payne-3-keyart-v2-800.jpg",
  "assets/images/max-payne-3-keyart-v2-1600.jpg",
  "assets/images/max-payne-artwork-400.webp",
  "assets/images/max-payne-artwork-800.webp",
  "assets/images/max-payne-artwork-1600.webp",
  "assets/images/max-payne-artwork-800.jpg",
  "assets/images/max-payne-artwork-1600.jpg",
];

const isCrossOrigin = (url) => /^https?:\/\//i.test(url);

async function precache() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    PRECACHE_ASSETS.map(async (url) => {
      const crossOrigin = isCrossOrigin(url);
      const request = new Request(url, crossOrigin ? { mode: "no-cors" } : {});
      try {
        const response = await fetch(request);
        // Same-origin responses must be ok; cross-origin no-cors responses are
        // opaque (ok === false, status 0) but are valid to store and replay.
        if (crossOrigin || response.ok) {
          await cache.put(request, response);
        }
      } catch (_) {
        /* Tolerate individual failures — never fail the whole install. */
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key.startsWith("max-payne-fan-"))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET; pass the rest through.
  if (request.method !== "GET") return;

  // Never serve cache for hard reloads or range requests.
  if (request.cache === "reload" || request.headers.has("range")) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Cache same-origin ("basic") and CORS ("cors") responses at runtime.
        // Opaque cross-origin responses are handled at precache time.
        if (
          response.ok &&
          (response.type === "basic" || response.type === "cors")
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
