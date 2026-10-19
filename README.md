# Max Payne Fan Page — Optimized Static Site

A performance-optimized, noir-comic Max Payne fan page with smooth rain/snow weather transitions, responsive images, and cache-first behavior.

## Tech

- **HTML5, CSS3, vanilla JS** — no framework
- **Service Worker** — cache-first; precaches assets on install (v4)
- **Responsive images** — WebP + JPEG with `srcset`/`sizes`
- **Canvas weather** — eased rain/snow crossfade, respects `prefers-reduced-motion`
- **Self-hosted fonts** — Space Grotesk (body) + a tiny 7-glyph Max Payne logo face
- **Performance tested** — see `PERFORMANCE.md`; cold S3-backed load ~900 ms → cached ~35 ms
- **Accessibility** — color-contrast audited (axe-core), see `CONTRAST.md`

## Quick start

```bash
# Local (uses local images in src/assets/images)
npm run serve  # http://localhost:4173

# Production build (rewrites images to S3/CloudFront)
cp .env.example .env  # set ASSETS_BASE_URL
npm run build
npm run serve:dist  # http://localhost:4173 (serves dist with S3 URLs)
```

## Scripts

- `npm run serve` — serve `src/` locally
- `npm run build` — copy `src/ → dist/`, rewrite image/audio URLs to `ASSETS_BASE_URL`, inject `QUOTE_API_URL`
- `npm run serve:dist` — serve `dist/` locally (uses `SERVE_DIR=dist`)
- `npm run measure` — measure cold vs cached request performance (uses Puppeteer + Chromium)
- `npm run check:contrast` — run axe-core color-contrast check in rain/snow states
- `npm run deploy:assets` — sync `src/assets/images/` and `src/assets/audio/` to S3 (`S3_BUCKET`, `S3_REGION`, key prefixes, `AWS_PROFILE`)

## Config (.env)

| Variable | Purpose |
|---|---|
| `ASSETS_BASE_URL` | Absolute origin for images (e.g. `https://<bucket>.s3.<region>.amazonaws.com`). When empty, local assets used. |
| `QUOTE_API_URL` | Base URL output by the `mp-mcp` SAM stack; injected into the built site's API config. |
| `S3_BUCKET` | S3 bucket name (for deploy:assets only) |
| `S3_REGION` | S3 region (for deploy:assets only) |
| `S3_KEY_PREFIX` | S3 key prefix (default `assets/images`) |
| `S3_AUDIO_KEY_PREFIX` | S3 key prefix (default `assets/audio`) |
| `AWS_PROFILE` | AWS CLI profile (for deploy:assets only) |

## Architecture notes

- **Cross-origin images & SW:** Images from a different origin are precached with `no-cors` (opaque) to avoid HTTP-cache CORS poisoning (see `DEPLOY.md`). Runtime requests use a cache-first strategy.
- **Media on S3 (by default):** Fonts, CSS, JS, HTML, and service worker stay with the site origin; image and audio URLs are rewritten at build time.
- **Static-first:** no build step needed for local dev; the build step only rewrites asset URLs for production.

## Docs

- `SPEC.md` — original requirements
- `PERFORMANCE.md` — detailed measurements
- `CONTRAST.md` — accessibility audit (axe-core)
- `DEPLOY.md` — S3 setup, CORS caveats, GitHub Pages notes
- `infra/*.json` — IAM/bucket policy/CORS templates (replace placeholders as needed)

## Development

```bash
# Install deps
npm install

# Verify
npm run check:contrast  # must return 0 violations
npm run serve            # dev server
npm run build && npm run measure  # build S3-backed dist and measure
```

## GitHub Pages

A workflow (`.github/workflows/deploy.yml`) builds `dist/` from `src/` and deploys to Pages. It reads `secrets.ASSETS_BASE_URL` and the `QUOTE_API_URL` repository variable; configure both in repository settings.

## Notes

- "Machine Medium" font replaced by self-hosted Space Grotesk + a 7-glyph Max Payne logo face (wordmark only).
- The weather canvas is a low-opacity overlay; contrast is enforced on DOM elements.
- Always bump `CACHE_VERSION` in `src/sw.js` when changing precache contents.
