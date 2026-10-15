const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = process.env.PORT || 4173;
const URL_BASE = `http://localhost:${PORT}`;
const AXE = require.resolve("axe-core/axe.min.js");

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

async function audit(page) {
  await page.addScriptTag({ path: AXE });
  const results = await page.evaluate(async () => {
    return axe.run(document, {
      runOnly: { type: "rule", values: ["color-contrast"] },
    });
  });
  return results.violations.flatMap((v) =>
    v.nodes.map((n) => ({
      rule: v.id,
      impact: n.impact,
      target: n.target.join(" "),
      html: n.html.slice(0, 120),
      summary: (n.failureSummary || "").split("\n").filter(Boolean).slice(1).join(" ").trim(),
      data: n.any?.[0]?.data || null,
    }))
  );
}

async function auditInWeather(page, weather) {
  // Force weather state deterministically, then let the crossfade settle
  await page.evaluate((w) => {
    try { localStorage.setItem("mp-weather", w); } catch (_) {}
  }, weather);
  await page.reload({ waitUntil: "load" });
  await page.evaluate(async () => {
    // reveal lazy content so everything is audited
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 400));
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));
  });
  // let weather crossfade settle fully if applicable
  await new Promise((r) => setTimeout(r, 2600));
  return audit(page);
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mp-contrast-"));
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: "new",
    userDataDir: dir,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL_BASE, { waitUntil: "load" });

  const rain = await auditInWeather(page, "rain");
  const snow = await auditInWeather(page, "snow");
  await browser.close();
  fs.rmSync(dir, { recursive: true, force: true });

  const report = { date: new Date().toISOString(), url: URL_BASE, rain, snow };
  const outPath = path.join(__dirname, "..", "contrast-results.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(`RAIN state: ${rain.length} contrast violation(s)`);
  rain.forEach((v) => console.log(`  [${v.impact}] ${v.target}\n    ${v.summary}`));
  console.log(`SNOW state: ${snow.length} contrast violation(s)`);
  snow.forEach((v) => console.log(`  [${v.impact}] ${v.target}\n    ${v.summary}`));
  console.log(`\nraw results -> ${outPath}`);
  process.exitCode = rain.length + snow.length > 0 ? 1 : 0;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
