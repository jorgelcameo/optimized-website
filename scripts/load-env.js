const fs = require("fs");
const path = require("path");

function loadEnv(envPath = path.join(__dirname, "..", ".env")) {
  const out = {};
  try {
    const text = fs.readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      out[key] = value;
    }
  } catch (_) {
    /* no .env — fine */
  }
  return out;
}

module.exports = { loadEnv };
