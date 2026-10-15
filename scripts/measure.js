const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = process.env.PORT || 4173;
const URL_BASE = `http://localhost:${PORT}`;
const TRIALS = 3;
const isImage = (url) => /\.(webp|jpg|jpeg|png|gif)$/i.test(new URL(url).pathname);

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error("No Chromium/Chrome found. Set CHROME_PATH.");
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    return {
      ttfb: Math.round(nav.responseStart),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      loadEvent: Math.round(nav.loadEventEnd),
      resourceCount: resources.length,
    };
  });
}

async function waitForPrecache(page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    for (let i = 0; i < 100; i++) {
      const keys = await caches.keys();
      if (keys.length) {
        const c = await caches.open(keys[0]);
        if ((await c.keys()).length > 10) break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  });
}

async function load(browser, { offline = false, precache = false } = {}) {
  const page = await browser.newPage();
  const responses = [];
  page.on("response", (r) => {
    responses.push({
      url: r.url(),
      status: r.status(),
      fromSW: r.fromServiceWorker(),
      fromCache: r.fromCache(),
    });
  });
  if (offline) await page.setOfflineMode(true);
  const start = Date.now();
  await page.goto(URL_BASE, { waitUntil: "load" });
  if (precache) await waitForPrecache(page);
  // let lazy images below the fold load so we can measure them
  const images = await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 500));
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 300));
    const imgs = [...document.images];
    return {
      total: imgs.length,
      loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
    };
  });
  const wallMs = Date.now() - start;
  const metrics = await collectMetrics(page);
  await page.close();
  return { metrics, wallMs, responses, images };
}

const summarizeImages = (responses) =>
  responses
    .filter((r) => isImage(r.url))
    .map((r) => ({
      name: r.url.split("/").pop(),
      fromSW: r.fromSW,
      fromCache: r.fromCache,
      status: r.status,
    }));

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mp-profile-"));
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: "new",
    userDataDir: dir,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const first = await load(browser, { precache: true });
  const warm = [];
  for (let i = 0; i < TRIALS; i++) warm.push(await load(browser));
  const offline = await load(browser, { offline: true });

  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });

  const avg = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
  const firstImages = summarizeImages(first.responses);
  const warmImages = summarizeImages(warm[0].responses);

  const result = {
    date: new Date().toISOString(),
    url: URL_BASE,
    browser: "Chromium (headless) + Service Worker",
    firstLoad: {
      ttfb: first.metrics.ttfb,
      domContentLoaded: first.metrics.domContentLoaded,
      loadEvent: first.metrics.loadEvent,
      wallMs: first.wallMs,
      images: first.images,
      imageSources: firstImages,
    },
    warmLoad: {
      ttfb: warm.map((w) => w.metrics.ttfb),
      domContentLoaded: warm.map((w) => w.metrics.domContentLoaded),
      loadEvent: warm.map((w) => w.metrics.loadEvent),
      wallMs: warm.map((w) => w.wallMs),
      images: warm.map((w) => w.images),
      imageSources: warmImages,
      imagesFromSW: warmImages.filter((i) => i.fromSW).length,
      imagesFromNetwork: warmImages.filter((i) => !i.fromSW).length,
    },
    offline: {
      succeeded: offline.metrics.loadEvent > 0,
      loadEvent: offline.metrics.loadEvent,
      images: offline.images,
      imagesFromSW: summarizeImages(offline.responses).filter((i) => i.fromSW).length,
    },
  };

  const outPath = path.join(__dirname, "..", "perf-results.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

  console.log("=== First request (cold) ===");
  console.log(`TTFB ${result.firstLoad.ttfb}ms | DCL ${result.firstLoad.domContentLoaded}ms | load ${result.firstLoad.loadEvent}ms | wall ${result.firstLoad.wallMs}ms (incl. SW precache)`);
  console.log(`images loaded: ${first.images.loaded}/${first.images.total} | from SW: ${firstImages.filter((i) => i.fromSW).length}`);
  console.log("=== Cached requests (avg of " + TRIALS + ") ===");
  console.log(`TTFB ${avg(result.warmLoad.ttfb)}ms | DCL ${avg(result.warmLoad.domContentLoaded)}ms | load ${avg(result.warmLoad.loadEvent)}ms | wall ${avg(result.warmLoad.wallMs)}ms`);
  console.log(`images loaded: ${result.warmLoad.images[0].loaded}/${result.warmLoad.images[0].total} | from SW: ${result.warmLoad.imagesFromSW} | from network: ${result.warmLoad.imagesFromNetwork}`);
  console.log("--- per-image source (cached load) ---");
  for (const im of warmImages) {
    console.log(`  ${im.fromSW ? "SW cache" : im.fromCache ? "disk cache" : "network "}  ${im.name}`);
  }
  console.log("=== Offline (S3 unreachable) ===");
  console.log(`load ${result.offline.loadEvent}ms | images loaded: ${result.offline.images.loaded}/${result.offline.images.total} | from SW: ${result.offline.imagesFromSW}`);
  console.log(`\nraw results -> ${outPath}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
