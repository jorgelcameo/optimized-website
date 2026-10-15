const fs = require("fs");
const path = require("path");
const { loadEnv } = require("./load-env");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");
const env = loadEnv();

const ASSETS_BASE_URL = (env.ASSETS_BASE_URL || "").replace(/\/+$/, "");
const IMAGE_PREFIX = "assets/images/";

const REWRITE_EXTENSIONS = new Set([".html", ".css", ".js"]);

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      // Images live on S3 in production — do not ship local copies.
      if (path.relative(SRC, src) === "assets" + path.sep + "images") continue;
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
    const needle = new RegExp(IMAGE_PREFIX.replace("/", "\\/"), "g");
    const count = (text.match(needle) || []).length;
    if (count) {
      text = text.replace(needle, `${ASSETS_BASE_URL}/${IMAGE_PREFIX}`);
      fs.writeFileSync(p, text);
      totalRewrites += count;
      console.log(`  rewrote ${count} asset URL(s) in ${path.relative(ROOT, p)}`);
    }
  }
  return totalRewrites;
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
console.log(`Built -> ${path.relative(ROOT, DIST)}`);
