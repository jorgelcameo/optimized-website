const http = require("http");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { loadEnv } = require("./load-env");

const ROOT = process.env.SERVE_DIR
  ? path.resolve(process.env.SERVE_DIR)
  : path.join(__dirname, "..", "src");
const PORT = process.env.PORT || 4173;
const env = loadEnv();
const ASSETS_BASE_URL = env.ASSETS_BASE_URL || "";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

const COMPRESSIBLE = new Set([".html", ".css", ".js", ".json", ".svg"]);

http
  .createServer((req, res) => {
    let urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (urlPath === "/") urlPath = "/index.html";
    const filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404).end("not found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const headers = {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
      };
      const accept = req.headers["accept-encoding"] || "";
      if (COMPRESSIBLE.has(ext) && accept.includes("br")) {
        headers["Content-Encoding"] = "br";
        headers["Vary"] = "Accept-Encoding";
        res.writeHead(200, headers).end(zlib.brotliCompressSync(data));
      } else if (COMPRESSIBLE.has(ext) && accept.includes("gzip")) {
        headers["Content-Encoding"] = "gzip";
        headers["Vary"] = "Accept-Encoding";
        res.writeHead(200, headers).end(zlib.gzipSync(data));
      } else {
        res.writeHead(200, headers).end(data);
      }
    });
  })
  .listen(PORT, () => {
    console.log(`serving ${ROOT} on http://localhost:${PORT}`);
    console.log(
      ASSETS_BASE_URL
        ? `prod assets origin (ASSETS_BASE_URL): ${ASSETS_BASE_URL}`
        : "prod assets origin (ASSETS_BASE_URL): not set — using local assets"
    );
  });
