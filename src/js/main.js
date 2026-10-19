(() => {
  "use strict";

  /* ================= WEATHER SYSTEM ================= */

  const canvas = document.getElementById("weather");
  const ctx = canvas.getContext("2d", { alpha: true });
  const toggleBtn = document.getElementById("weather-toggle");
  const iconEl = document.getElementById("weather-icon");
  const labelEl = document.getElementById("weather-label");

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, DPR = 1;
  const drops = [];
  const flakes = [];

  // Current blend: 0 = full rain, 1 = full snow. Eased toward target.
  let mix = 0;
  let targetMix = 0;
  const EASE = 0.018; // slow, smooth crossfade (~2-3s transition)

  const RAIN_COUNT = 160;
  const SNOW_COUNT = 110;

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function spawnRain(drop, init) {
    drop.x = Math.random() * (W + 200) - 100;
    drop.y = init ? Math.random() * H : -20;
    drop.len = 12 + Math.random() * 18;
    drop.speed = 14 + Math.random() * 10;
    drop.wind = -2.5 - Math.random() * 1.5;
    drop.alpha = 0.25 + Math.random() * 0.35;
    drop.thick = Math.random() < 0.15 ? 1.6 : 1;
  }

  function spawnSnow(flake, init) {
    flake.x = Math.random() * W;
    flake.y = init ? Math.random() * H : -10;
    flake.r = 0.8 + Math.random() * 2.2;
    flake.speed = 0.6 + Math.random() * 1.2;
    flake.drift = (Math.random() - 0.5) * 0.8;
    flake.phase = Math.random() * Math.PI * 2;
    flake.alpha = 0.45 + Math.random() * 0.5;
  }

  function init() {
    resize();
    for (let i = 0; i < RAIN_COUNT; i++) {
      const d = {};
      spawnRain(d, true);
      drops.push(d);
    }
    for (let i = 0; i < SNOW_COUNT; i++) {
      const f = {};
      spawnSnow(f, true);
      flakes.push(f);
    }
  }

  function drawRain() {
    // Rain becomes less visible as mix -> 1
    const a = 1 - mix;
    if (a <= 0.01) return;
    ctx.strokeStyle = `rgba(217, 216, 159, ${0.9 * a})`;
    ctx.lineCap = "round";
    for (const d of drops) {
      d.y += d.speed * (1 + mix * 0.3); // slight speed-up mid-fade feels physical
      d.x += d.wind;
      if (d.y > H + 20 || d.x < -120) spawnRain(d, false);
      ctx.globalAlpha = d.alpha;
      ctx.lineWidth = d.thick;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.wind * 2.2, d.y - d.len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawSnow() {
    // Snow fades in as mix -> 1
    const a = mix;
    if (a <= 0.01) return;
    for (const f of flakes) {
      f.phase += 0.01 + f.r * 0.004;
      f.y += f.speed * (1.6 - mix * 0.6); // slows down as it "arrives"
      f.x += f.drift + Math.sin(f.phase) * 0.6;
      if (f.y > H + 8) spawnSnow(f, false);
      if (f.x < -10) f.x = W + 10;
      else if (f.x > W + 10) f.x = -10;

      ctx.globalAlpha = f.alpha * a;
      ctx.fillStyle = "#d9d89f";
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  let last = 0;
  function frame(t) {
    // Cap logic to ~60fps; skip identical frames on weak devices
    if (t - last < 16) {
      requestAnimationFrame(frame);
      return;
    }
    last = t;

    // Ease mix toward target for a smooth weather crossfade
    const diff = targetMix - mix;
    if (Math.abs(diff) > 0.001) {
      mix += diff * EASE * 16;
    } else {
      mix = targetMix;
    }

    ctx.clearRect(0, 0, W, H);
    drawRain();
    drawSnow();
    requestAnimationFrame(frame);
  }

  function setWeather(snowy, animate = true) {
    targetMix = snowy ? 1 : 0;
    if (!animate) mix = targetMix;
    toggleBtn.setAttribute("aria-pressed", String(snowy));
    iconEl.textContent = snowy ? "❄" : "☔";
    labelEl.textContent = snowy ? "SNOW" : "RAIN";
    try { localStorage.setItem("mp-weather", snowy ? "snow" : "rain"); } catch (_) {}
  }

  toggleBtn.addEventListener("click", () => {
    setWeather(targetMix < 0.5);
  });

  addEventListener("resize", resize, { passive: true });

  // Respect saved preference + reduced motion
  let saved = "rain";
  try { saved = localStorage.getItem("mp-weather") || "rain"; } catch (_) {}
  init();
  setWeather(saved === "snow", !REDUCED);
  if (!REDUCED) {
    requestAnimationFrame(frame);
  } else {
    // Static single paint for reduced-motion users
    ctx.clearRect(0, 0, W, H);
    drawRain();
    drawSnow();
  }

  /* ================= CACHE STATUS ================= */

  /* ================= MAXPAYNIZER ================= */

  const maxpaynizerForm = document.getElementById("maxpaynizer-form");
  const maxpaynizerInput = document.getElementById("maxpaynizer-input");
  const maxpaynizerButton = document.getElementById("maxpaynizer-submit");
  const maxpaynizerResult = document.getElementById("maxpaynizer-result");
  const maxpaynizerQuota = document.getElementById("maxpaynizer-quota");
  const quoteApiBase = (
    document.querySelector('meta[name="quote-api-url"]')?.content || ""
  ).replace(/\/+$/, "");
  const reloadSound = document.getElementById("beretta-reload");
  const shotSound = document.getElementById("beretta-shot");
  let remainingUses = null;

  function playSound(audio) {
    if (!audio) return;
    audio.volume = 0.35;
    audio.currentTime = 0;
    const playback = audio.play();
    if (playback) playback.catch(() => {});
  }

  function formatWait(seconds) {
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
    const hours = Math.ceil(minutes / 60);
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  function updateQuota(quota) {
    if (!quota) return;
    remainingUses = quota.remaining;
    maxpaynizerButton.disabled = remainingUses <= 0;
    if (remainingUses > 0) {
      maxpaynizerQuota.textContent = `${remainingUses} of ${quota.limit} Maxpaynizes available this window.`;
    } else {
      maxpaynizerQuota.textContent = `No Maxpaynizes left. Try again in ${formatWait(quota.resetInSeconds)}.`;
    }
  }

  async function refreshQuota() {
    const response = await fetch(`${quoteApiBase}/quota`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("quota unavailable");
    const data = await response.json();
    updateQuota(data.quota);
  }

  function showMaxpaynizerResult({ quote, speaker, source, reason }, isError = false) {
    maxpaynizerResult.replaceChildren();
    maxpaynizerResult.hidden = false;
    maxpaynizerResult.dataset.error = String(isError);

    const quoteEl = document.createElement("p");
    quoteEl.className = "maxpaynizer__quote";
    quoteEl.textContent = quote ? `“${quote}”` : reason || "No close match in the current collection.";
    maxpaynizerResult.append(quoteEl);

    if (speaker) {
      const speakerEl = document.createElement("p");
      speakerEl.className = "maxpaynizer__speaker";
      speakerEl.textContent = `— ${speaker}${source ? ` · ${source}` : ""}`;
      maxpaynizerResult.append(speakerEl);
    }

    if (quote && reason) {
      const reasonEl = document.createElement("p");
      reasonEl.className = "maxpaynizer__reason";
      reasonEl.textContent = reason;
      maxpaynizerResult.append(reasonEl);
    }
  }

  if (maxpaynizerForm) {
    maxpaynizerButton.disabled = true;
    if (!quoteApiBase) {
      maxpaynizerQuota.textContent = "The quote service is not configured.";
    } else {
      refreshQuota()
        .catch(() => {
          maxpaynizerQuota.textContent = "Could not check the quota. The server will check it when you submit.";
          maxpaynizerButton.disabled = false;
        });
    }

    maxpaynizerButton.addEventListener("pointerenter", () => playSound(reloadSound));
    maxpaynizerButton.addEventListener("focus", () => playSound(reloadSound));
    maxpaynizerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!quoteApiBase || maxpaynizerButton.disabled) return;

      playSound(shotSound);
      maxpaynizerButton.disabled = true;
      maxpaynizerButton.textContent = "SEARCHING…";
      showMaxpaynizerResult({ quote: "Searching the streets…" });

      try {
        const response = await fetch(`${quoteApiBase}/quote`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ text: maxpaynizerInput.value.trim() }),
        });
        const data = await response.json();
        if (data.quota) updateQuota(data.quota);
        if (response.status === 429) {
          showMaxpaynizerResult({
            quote: `Out of Maxpaynizes. Try again in ${formatWait(data.quota?.resetInSeconds || 0)}.`,
          }, true);
        } else if (!response.ok) {
          showMaxpaynizerResult({ quote: data.error || "The quote service hit a snag. Try again later." }, true);
        } else {
          showMaxpaynizerResult(data.match || {});
        }
      } catch (_) {
        showMaxpaynizerResult({ quote: "Could not reach the quote service. Try again later." }, true);
        try {
          await refreshQuota();
        } catch (_) {
          maxpaynizerButton.disabled = false;
        }
      } finally {
        maxpaynizerButton.disabled = remainingUses !== null && remainingUses <= 0;
        maxpaynizerButton.textContent = "Maxpaynize It!";
      }
    });
  }

  const statusEl = document.getElementById("cache-status");
  async function updateCacheStatus() {
    if (!("serviceWorker" in navigator) || !caches) {
      statusEl.textContent = "cache unsupported";
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const keys = await caches.keys();
      const cache = keys.length ? await caches.open(keys[0]) : null;
      const count = cache ? (await cache.keys()).length : 0;
      statusEl.textContent = reg.active && count > 0
        ? `${count} assets cached — reloading serves from cache`
        : "cache warming…";
    } catch (_) {
      statusEl.textContent = "cache unavailable";
    }
  }

  if (document.readyState === "complete") updateCacheStatus();
  else addEventListener("load", updateCacheStatus);
})();
