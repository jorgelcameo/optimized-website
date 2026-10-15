# Performance Results — Max Payne Fan Page

Measured **2026-10-15** with headless Chromium (persistent profile so the Service Worker survives across loads), 3 trials for warm loads. The site is served locally from `dist/` (built), with **images served from S3** (`https://max-payne-assets.s3.us-east-2.amazonaws.com`).

Reproduce: `npm run build`, `npm run serve:dist` (terminal 1), `npm run measure` (terminal 2).

## First request (cold — no Service Worker, images download from S3)

| Metric | Result |
|---|---|
| TTFB | 20 ms |
| DOMContentLoaded | 74 ms |
| Load event | 906 ms (images fetched from S3 over the network) |
| Wall time incl. SW install + precache of 26 assets from S3 | 3466 ms |
| Images loaded | 5 / 5 |

On this first visit the Service Worker installs and **pre-caches all 26 assets from S3** in the background. (2 of the 5 on-page images were already served from the SW cache because precache finished first.)

## Subsequent requests (Service Worker active — 3 trials)

| Metric | Trial 1 | Trial 2 | Trial 3 | Avg |
|---|---|---|---|---|
| TTFB | 4 ms | 4 ms | 4 ms | **4 ms** |
| DOMContentLoaded | 36 ms | 32 ms | 33 ms | **34 ms** |
| Load event | 37 ms | 33 ms | 34 ms | **35 ms** |
| Images from SW cache | 5 / 5 | 5 / 5 | 5 / 5 | **100 %** |
| Images from network | 0 | 0 | 0 | **0** |

Per-image source on a cached load:

```
SW cache  max-payne-1-keyart-800.webp
SW cache  max-payne-1-keyart-400.webp
SW cache  max-payne-2-keyart-400.webp
SW cache  max-payne-3-keyart-800.webp
SW cache  max-payne-artwork-800.webp
```

## Comparison

| Metric | First request | Cached requests | Change |
|---|---|---|---|
| TTFB | 20 ms | 4 ms | **−80 %** |
| DOMContentLoaded | 74 ms | 34 ms | **−54 %** |
| Load event | 906 ms | 35 ms | **−96 %** |
| Images from network | 5 (S3) | 0 | **−100 %** |

## Offline proof

With the browser set to **offline mode** after the first visit (S3 unreachable), the page still fully loads: load event ~40 ms, **5/5 images loaded from the SW cache**, 0 network requests.

## How caching works

- `sw.js` precaches the full asset manifest on `install` (versioned cache `max-payne-fan-v4`; bump `CACHE_VERSION` when assets change).
- Same-origin assets are precached normally. **Cross-origin images from S3 are precached with `mode:"no-cors"` and stored as opaque responses** — see `DEPLOY.md` for why (it avoids a CORS race with the page's `<img>` loads).
- All `GET` requests use a **cache-first** strategy: cache hit → return immediately; miss → network fetch, then store for next time.
- Images use responsive `srcset` (400/800/1600 px WebP + JPEG fallback) with long-lived `Cache-Control: immutable` on S3.
- Fonts are self-hosted; the Max Payne logo face is a 728 B WOFF2 limited via `unicode-range` to its 7 glyphs.

## Notes

- The cold load event (906 ms) is dominated by fetching images from S3 over the network; on a warm cache it collapses to 35 ms.
- Local development (`ASSETS_BASE_URL` empty, `npm run serve`) uses local images and shows the same cache-first behaviour with lower cold-load latency.
