const fs = require("fs");
const path = require("path");
const { loadEnv } = require("./load-env");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");
// .env supplies local defaults; real environment variables (CI secrets) win.
const env = { ...loadEnv(), ...process.env };

const ASSETS_BASE_URL = (env.ASSETS_BASE_URL || "").replace(/\/+$/, "");
const IMAGE_PREFIX = "assets/images/";
const AUDIO_PREFIX = "assets/audio/";
const QUOTE_API_URL = (env.QUOTE_API_URL || "").replace(/\/+$/, "");

const REWRITE_EXTENSIONS = new Set([".html", ".css", ".js"]);

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      // Media lives on S3 in production — do not ship local copies.
      const relative = path.relative(SRC, src);
      if (relative === path.join("assets", "images") || relative === path.join("assets", "audio")) continue;
      copyDir(src, dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

function rewriteFiles(dir) {
  let totalRewrites = 0;
  for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, file.name);
    if (file.isDirectory()) {
      totalRewrites += rewriteFiles(p);
      continue;
    }
    if (!REWRITE_EXTENSIONS.has(path.extname(file.name))) continue;
    let text = fs.readFileSync(p, "utf8");
    const before = text;
    for (const prefix of [IMAGE_PREFIX, AUDIO_PREFIX]) {
      const needle = new RegExp(prefix.replace("/", "\\/"), "g");
      const count = (text.match(needle) || []).length;
      if (ASSETS_BASE_URL && count) {
        text = text.replace(needle, `${ASSETS_BASE_URL}/${prefix}`);
        totalRewrites += count;
        console.log(`  rewrote ${count} asset URL(s) in ${path.relative(ROOT, p)}`);
      }
    }
    if (text !== before) {
      fs.writeFileSync(p, text);
    }
  }
  return totalRewrites;
}

function configureQuoteApi(dir) {
  const htmlPath = path.join(dir, "index.html");
  let html = fs.readFileSync(htmlPath, "utf8");
  const escapedUrl = QUOTE_API_URL.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  html = html.replace(
    /(<meta name="quote-api-url" content=")[^"]*(">)/,
    `$1${escapedUrl}$2`
  );
  fs.writeFileSync(htmlPath, html);
}

fs.rmSync(DIST, { recursive: true, force: true });
copyDir(SRC, DIST);

if (ASSETS_BASE_URL) {
  console.log(`assets origin: ${ASSETS_BASE_URL}`);
  const n = rewriteFiles(DIST);
  console.log(`Total rewritten references: ${n}`);
} else {
  console.log("ASSETS_BASE_URL empty — shipping local assets (no rewrite).");
}
configureQuoteApi(DIST);
console.log(QUOTE_API_URL ? `quote API: ${QUOTE_API_URL}` : "QUOTE_API_URL empty — quote feature stays disconnected.");
console.log(`Built -> ${path.relative(ROOT, DIST)}`);
