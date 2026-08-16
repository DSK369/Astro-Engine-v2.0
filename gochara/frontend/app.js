// Gochara — planetary transit timeline.
// All positions come from the backend (Swiss Ephemeris, same math as
// astro-engine); this file only handles UI, fetching, and canvas drawing.

import { CITIES } from "./cities.js?v=3";
import {
  PLANETS, RASHIS, NAKSHATRAS, NAK_SPAN, CHARAN_SPAN,
  rashiAt, nakshatraAt, charanAt, formatDMS, UI, PRESETS,
} from "./astro-data.js?v=3";

const $ = (id) => document.getElementById(id);

const DAY = 864e5;
const MIN_SPAN = 30 * 60 * 1000;          // 30 minutes
const MAX_SPAN = 45 * 365.25 * DAY;       // 45 years
const FETCH_POINTS = 1200;

// ---------- State ----------
const state = {
  lang: localStorage.getItem("gochara-lang") || "en",
  location: JSON.parse(localStorage.getItem("gochara-loc") || "null") || CITIES[0],
  viewStart: Date.now() - 182.625 * DAY,  // default: 1 year centered on now
  viewEnd: Date.now() + 182.625 * DAY,
  yMode: "rashi",                          // rashi | nakshatra | charan
  xGrid: "off",                            // off | day | month | year
  ayanamsa: "CUSTOM_KP",
  nodeType: "MEAN",
  active: new Set(PLANETS.map((p) => p.id)),
  data: null,                              // { times, series, retro, ayanamsa }
  loading: false,
};

const t = (key) => (UI[key] ? UI[key][state.lang] : key);

// ---------- Timezone helpers ----------
// Formatter construction is expensive and tzParts runs per gridline —
// memoize per timezone.
const _tzFmtCache = {};
function tzParts(ms, tz) {
  const fmt = (_tzFmtCache[tz] ||= new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }));
  const p = {};
  for (const part of fmt.formatToParts(ms)) p[part.type] = part.value;
  if (p.hour === "24") p.hour = "00";
  return p;
}

// epoch ms -> "YYYY-MM-DDTHH:MM" in the selected tz (datetime-local + API format)
function msToTzInput(ms, tz) {
  const p = tzParts(ms, tz);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

function fmtTime(ms, opts) {
  const locale = state.lang === "hi" ? "hi-IN" : "en-IN";
  return new Intl.DateTimeFormat(locale, { timeZone: state.location.tz, ...opts }).format(ms);
}

function fmtTick(ms, spanMs) {
  if (spanMs < 2 * DAY) return fmtTime(ms, { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short", hour12: false });
  if (spanMs < 90 * DAY) return fmtTime(ms, { day: "numeric", month: "short", year: "2-digit" });
  if (spanMs < 3 * 365 * DAY) return fmtTime(ms, { month: "short", year: "numeric" });
  return fmtTime(ms, { year: "numeric" });
}

function fmtFull(ms) {
  const span = state.viewEnd - state.viewStart;
  const withTime = span < 120 * DAY;
  return fmtTime(ms, {
    day: "numeric", month: "short", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  });
}

// ---------- Data fetching ----------
let fetchTimer = null;
let fetchSeq = 0;

function scheduleFetch(delay = 350) {
  clearTimeout(fetchTimer);
  fetchTimer = setTimeout(fetchData, delay);
}

async function fetchData() {
  const seq = ++fetchSeq;
  state.loading = true;
  setStatusPill("busy");
  $("loading").classList.remove("hidden");

  const body = {
    start: msToTzInput(state.viewStart, state.location.tz),
    end: msToTzInput(state.viewEnd, state.location.tz),
    timezone: state.location.tz,
    points: FETCH_POINTS,
    ayanamsa_mode: state.ayanamsa,
    node_type: state.nodeType,
  };

  try {
    const res = await fetch("/api/ephemeris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
    const json = await res.json();
    if (seq !== fetchSeq) return; // superseded by a newer request
    state.data = json;
    setStatusPill("ok");
  } catch (err) {
    if (seq !== fetchSeq) return;
    setStatusPill("err", String(err.message || err));
  } finally {
    if (seq === fetchSeq) {
      state.loading = false;
      $("loading").classList.add("hidden");
      syncRangeInputs();
      draw();
      updateStatusBar();
    }
  }
}

function setStatusPill(kind, msg) {
  const pill = $("status-pill");
  pill.className = `pill pill--${kind}`;
  pill.textContent = kind === "err" ? "! error" : "●";
  pill.title = msg || "";
}

// ---------- Canvas ----------
const canvas = $("chart");
const ctx = canvas.getContext("2d");
const overlay = $("overlay");
const octx = overlay.getContext("2d");
let plotW = 0, plotH = 0, cssW = 0, cssH = 0;

function margins() {
  return { top: 10, right: 14, bottom: 30, left: state.yMode === "rashi" ? 92 : 138 };
}

function resizeCanvas() {
  const wrap = $("canvas-wrap");
  cssW = wrap.clientWidth;
  cssH = wrap.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  overlay.width = canvas.width;
  overlay.height = canvas.height;
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

const xOf = (ms) => {
  const m = margins();
  return m.left + ((ms - state.viewStart) / (state.viewEnd - state.viewStart)) * plotW;
};
const yOf = (deg) => {
  const m = margins();
  return m.top + plotH - (deg / 360) * plotH;
};

function draw() {
  const m = margins();
  plotW = cssW - m.left - m.right;
  plotH = cssH - m.top - m.bottom;
  if (plotW <= 10 || plotH <= 10) return;

  ctx.clearRect(0, 0, cssW, cssH);
  drawBands(m);
  drawXGrid(m);
  if (state.data) drawCurves(m);
  drawXAxis(m);
}

// ---------- Calendar gridlines ----------
const UNIT_MS = { day: DAY, month: 30.44 * DAY, year: 365.25 * DAY };

// Boundaries (local midnight in the selected tz) of the chosen calendar
// unit inside the view window. `stride` thins them so we never draw or
// convert more than ~240 lines even for 40 years of days.
function calendarBoundaries(unit) {
  const span = state.viewEnd - state.viewStart;
  const stride = Math.max(1, Math.ceil(span / UNIT_MS[unit] / 240));
  const p = tzParts(state.viewStart, state.location.tz);
  let y = +p.year;
  let mo = unit === "year" ? 1 : +p.month;
  let d = unit === "day" ? +p.day : 1;
  const pad = (n) => String(n).padStart(2, "0");
  const list = [];
  for (let i = 0; i < 500; i++) {
    const ms = tzInputToMs(`${y}-${pad(mo)}-${pad(d)}T00:00`);
    if (ms > state.viewEnd) break;
    if (ms >= state.viewStart) list.push({ ms, y, mo, d });
    if (unit === "day") {
      const dt = new Date(Date.UTC(y, mo - 1, d) + stride * DAY);
      y = dt.getUTCFullYear(); mo = dt.getUTCMonth() + 1; d = dt.getUTCDate();
    } else if (unit === "month") {
      mo += stride;
      while (mo > 12) { mo -= 12; y++; }
    } else {
      y += stride;
    }
  }
  return list;
}

function drawXGrid(m) {
  if (state.xGrid === "off") return;
  const unit = state.xGrid;
  const bounds = calendarBoundaries(unit);
  if (!bounds.length) return;

  const spacing = plotW / Math.max(bounds.length, 1);
  const showLabels = spacing >= 42;

  ctx.save();
  ctx.beginPath();
  ctx.rect(m.left, m.top, plotW, plotH);
  ctx.clip();
  ctx.font = "9px 'JetBrains Mono', ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  for (const b of bounds) {
    const x = xOf(b.ms);
    // Higher-order boundaries (month start in day mode, year start in
    // month mode) get a stronger line so the rhythm stays readable.
    const major =
      (unit === "day" && b.d === 1) || (unit === "month" && b.mo === 1);
    ctx.strokeStyle = major
      ? "rgba(138, 143, 152, 0.42)"
      : "rgba(138, 143, 152, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, m.top);
    ctx.lineTo(x, m.top + plotH);
    ctx.stroke();

    if (showLabels) {
      let label;
      if (unit === "year") label = String(b.y);
      else if (unit === "month")
        label = fmtTime(b.ms, { month: "short" }) + (b.mo === 1 ? " " + b.y : "");
      else
        label = fmtTime(b.ms, { day: "numeric", month: "short" });
      ctx.fillStyle = major ? "#8a8f98" : "#62666d";
      ctx.fillText(label, x + 3, m.top + 3);
    }
  }
  ctx.restore();
}

function drawBands(m) {
  const bandCount = state.yMode === "rashi" ? 12 : 27;
  const bandDeg = 360 / bandCount;
  const names = state.yMode === "rashi" ? RASHIS : NAKSHATRAS;

  for (let i = 0; i < bandCount; i++) {
    const yBot = yOf(i * bandDeg);
    const yTop = yOf((i + 1) * bandDeg);

    ctx.fillStyle = i % 2 === 0 ? "rgba(24, 25, 26, 0.5)" : "rgba(15, 16, 17, 0.3)";
    ctx.fillRect(m.left, yTop, plotW, yBot - yTop);

    ctx.strokeStyle = "rgba(52, 52, 58, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(m.left, yTop);
    ctx.lineTo(m.left + plotW, yTop);
    ctx.stroke();

    ctx.fillStyle = "#8a8f98";
    ctx.font = `${state.yMode === "rashi" ? 11 : 9.5}px Inter, sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(names[i][state.lang], m.left - 8, (yTop + yBot) / 2);
  }

  // Charan mode: minor line every 3°20' + rashi-boundary emphasis
  if (state.yMode === "charan") {
    ctx.strokeStyle = "rgba(52, 52, 58, 0.25)";
    for (let c = 1; c < 108; c++) {
      if (c % 4 === 0) continue; // nakshatra lines already drawn
      const y = yOf(c * CHARAN_SPAN);
      ctx.beginPath();
      ctx.moveTo(m.left, y);
      ctx.lineTo(m.left + plotW, y);
      ctx.stroke();
    }
  }
  if (state.yMode !== "rashi") {
    // emphasize the 12 rashi boundaries on top of nakshatra bands
    ctx.strokeStyle = "rgba(94, 106, 210, 0.35)";
    for (let r = 0; r <= 12; r++) {
      const y = yOf(r * 30);
      ctx.beginPath();
      ctx.moveTo(m.left, y);
      ctx.lineTo(m.left + plotW, y);
      ctx.stroke();
    }
  }

  // frame
  ctx.strokeStyle = "rgba(52, 52, 58, 0.8)";
  ctx.strokeRect(m.left, m.top, plotW, plotH);
}

function visibleIndexRange(times) {
  let i0 = 0, i1 = times.length - 1;
  while (i0 < i1 && times[i0 + 1] < state.viewStart) i0++;
  while (i1 > i0 && times[i1 - 1] > state.viewEnd) i1--;
  return [i0, i1];
}

function drawCurves(m) {
  const { times, series, retro } = state.data;
  const [i0, i1] = visibleIndexRange(times);

  ctx.save();
  ctx.beginPath();
  ctx.rect(m.left, m.top, plotW, plotH);
  ctx.clip();

  for (const p of PLANETS) {
    if (!state.active.has(p.id) || !series[p.id]) continue;
    const lons = series[p.id];
    const flags = retro[p.id];

    // Split into runs of constant retro flag so retrograde stretches can
    // be dashed differently; each run is drawn with wrap-around handling.
    let runStart = i0;
    for (let i = i0 + 1; i <= i1; i++) {
      if (flags[i] !== flags[runStart] || i === i1) {
        drawRun(p, times, lons, runStart, i, flags[runStart]);
        runStart = i;
      }
    }
  }
  ctx.restore();
}

function drawRun(p, times, lons, a, b, isRetro) {
  ctx.strokeStyle = p.color;
  ctx.lineWidth = p.width;
  // Identity dash (nodes/outer planets) wins; otherwise retro gets [3,3].
  ctx.setLineDash(p.dash ? p.dash : isRetro ? [3, 3] : []);

  ctx.beginPath();
  ctx.moveTo(xOf(times[a]), yOf(lons[a]));
  for (let i = a + 1; i <= b; i++) {
    const l0 = lons[i - 1], l1 = lons[i];
    const x0 = xOf(times[i - 1]), x1 = xOf(times[i]);
    if (Math.abs(l1 - l0) > 180) {
      // Wrapped across 0/360 — interpolate the crossing so both stubs
      // reach the plot edge instead of a vertical jump line.
      const up = l0 > l1; // e.g. 358 -> 2 (crossing 360 upward)
      const dl = up ? l1 + 360 - l0 : l1 - 360 - l0;
      const tX = up ? (360 - l0) / dl : (0 - l0) / dl;
      const xc = x0 + tX * (x1 - x0);
      ctx.lineTo(xc, yOf(up ? 360 : 0));
      ctx.moveTo(xc, yOf(up ? 0 : 360));
      ctx.lineTo(x1, yOf(l1));
    } else {
      ctx.lineTo(x1, yOf(l1));
    }
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawXAxis(m) {
  const span = state.viewEnd - state.viewStart;
  const ticks = plotW > 700 ? 8 : plotW > 420 ? 5 : 3;

  ctx.fillStyle = "#8a8f98";
  ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.strokeStyle = "rgba(52, 52, 58, 0.6)";

  for (let i = 0; i <= ticks; i++) {
    const ms = state.viewStart + (i / ticks) * span;
    const x = xOf(ms);
    ctx.beginPath();
    ctx.moveTo(x, m.top + plotH);
    ctx.lineTo(x, m.top + plotH + 4);
    ctx.stroke();
    const align = i === 0 ? "left" : i === ticks ? "right" : "center";
    ctx.textAlign = align;
    ctx.fillText(fmtTick(ms, span), x, m.top + plotH + 8);
  }
}

// ---------- Tooltip ----------
const tooltip = $("tooltip");

// Crosshair: dashed hairlines through the cursor with the axis values
// pinned to the edges — always visible while hovering, whether or not a
// curve is nearby. Drawn on the overlay canvas so the chart itself never
// re-renders on mousemove.
function clearOverlay() {
  octx.clearRect(0, 0, cssW, cssH);
}

function drawCrosshair(mx, my, m) {
  clearOverlay();

  octx.strokeStyle = "rgba(138, 143, 152, 0.5)";
  octx.lineWidth = 1;
  octx.setLineDash([4, 4]);
  octx.beginPath();
  octx.moveTo(mx, m.top);
  octx.lineTo(mx, m.top + plotH);
  octx.moveTo(m.left, my);
  octx.lineTo(m.left + plotW, my);
  octx.stroke();
  octx.setLineDash([]);

  // X value (time) pinned to the bottom axis
  const ms = state.viewStart + ((mx - m.left) / plotW) * (state.viewEnd - state.viewStart);
  axisLabelBox(fmtFull(ms), mx, m.top + plotH + 2, "x", m);

  // Y value (zodiac position) pinned to the left edge, detail follows the
  // selected Y granularity
  const deg = (1 - (my - m.top) / plotH) * 360;
  let yLabel = `${rashiAt(deg)[state.lang]} ${formatDMS(deg)}`;
  if (state.yMode === "nakshatra") yLabel = `${nakshatraAt(deg)[state.lang]} · ${yLabel}`;
  if (state.yMode === "charan") yLabel = `${nakshatraAt(deg)[state.lang]}-${charanAt(deg)} · ${yLabel}`;
  axisLabelBox(yLabel, m.left + 4, my, "y", m);
}

function axisLabelBox(text, x, y, axis, m) {
  octx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
  const w = octx.measureText(text).width + 12;
  const h = 17;
  let bx, by;
  if (axis === "x") {
    bx = Math.min(Math.max(x - w / 2, m.left), m.left + plotW - w);
    by = y;
  } else {
    bx = x;
    by = Math.min(Math.max(y - h / 2, m.top), m.top + plotH - h);
  }
  octx.fillStyle = "#141516";
  octx.strokeStyle = "#34343a";
  octx.beginPath();
  octx.roundRect(bx, by, w, h, 4);
  octx.fill();
  octx.stroke();
  octx.fillStyle = "#f7f8f8";
  octx.textAlign = "left";
  octx.textBaseline = "middle";
  octx.fillText(text, bx + 6, by + h / 2 + 0.5);
}

function onHover(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const m = margins();
  if (mx < m.left || mx > m.left + plotW || my < m.top || my > m.top + plotH) {
    tooltip.classList.add("hidden");
    clearOverlay();
    return;
  }

  drawCrosshair(mx, my, m);

  if (!state.data) { tooltip.classList.add("hidden"); return; }
  const { times, series, retro } = state.data;
  const hoverMs = state.viewStart + ((mx - m.left) / plotW) * (state.viewEnd - state.viewStart);
  // nearest sample index
  let idx = 0, best = Infinity;
  for (let i = 0; i < times.length; i++) {
    const d = Math.abs(times[i] - hoverMs);
    if (d < best) { best = d; idx = i; }
  }

  let hit = null, bestPx = 16;
  for (const p of PLANETS) {
    if (!state.active.has(p.id) || !series[p.id]) continue;
    const dPx = Math.abs(my - yOf(series[p.id][idx]));
    if (dPx < bestPx) { bestPx = dPx; hit = p; }
  }

  if (!hit) { tooltip.classList.add("hidden"); return; }

  const lon = series[hit.id][idx];
  const isRetro = retro[hit.id][idx] === 1;
  tooltip.innerHTML = `
    <div class="tooltip__head">
      <span class="tooltip__dot" style="background:${hit.color}"></span>
      ${hit[state.lang]}${isRetro ? ` <span class="tooltip__retro">(${t("retro")})</span>` : ""}
    </div>
    <div class="tooltip__row"><span>${t("time")}</span><b>${fmtFull(times[idx])}</b></div>
    <div class="tooltip__row"><span>${t("position")}</span><b>${formatDMS(lon)}</b></div>
    <div class="tooltip__row"><span>${t("rashi")}</span><b>${rashiAt(lon)[state.lang]}</b></div>
    <div class="tooltip__row"><span>${t("nakshatra")}</span><b>${nakshatraAt(lon)[state.lang]}</b></div>
    <div class="tooltip__row"><span>${t("charan")}</span><b>${charanAt(lon)}</b></div>`;

  let lx = mx + 16;
  if (lx + 190 > cssW) lx = mx - 200;
  tooltip.style.left = `${lx}px`;
  tooltip.style.top = `${Math.min(my + 12, cssH - 150)}px`;
  tooltip.classList.remove("hidden");
}

// ---------- Zoom & pan ----------
function onWheel(e) {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const m = margins();
  const mx = e.clientX - rect.left;
  const frac = Math.min(Math.max((mx - m.left) / plotW, 0), 1);
  const span = state.viewEnd - state.viewStart;
  const factor = e.deltaY > 0 ? 1.25 : 0.8;
  let newSpan = Math.min(Math.max(span * factor, MIN_SPAN), MAX_SPAN);
  const anchor = state.viewStart + frac * span;
  state.viewStart = anchor - frac * newSpan;
  state.viewEnd = anchor + (1 - frac) * newSpan;
  draw();
  updateStatusBar();
  scheduleFetch();
}

let dragging = null;
function onDown(e) { dragging = { x: e.clientX, s: state.viewStart, e: state.viewEnd }; }
function onMove(e) {
  if (!dragging) { onHover(e); return; }
  tooltip.classList.add("hidden");
  clearOverlay();
  const dx = e.clientX - dragging.x;
  const span = dragging.e - dragging.s;
  const shift = -(dx / plotW) * span;
  state.viewStart = dragging.s + shift;
  state.viewEnd = dragging.e + shift;
  draw();
  updateStatusBar();
}
function onUp() {
  if (dragging) { dragging = null; scheduleFetch(); }
}

// ---------- Status bar ----------
function humanSpan(ms) {
  if (ms < 2 * 3600e3) return `${Math.round(ms / 60e3)} min`;
  if (ms < 2 * DAY) return `${(ms / 3600e3).toFixed(1)} hr`;
  if (ms < 90 * DAY) return `${(ms / DAY).toFixed(1)} d`;
  if (ms < 2 * 365.25 * DAY) return `${(ms / (30.44 * DAY)).toFixed(1)} mo`;
  return `${(ms / (365.25 * DAY)).toFixed(1)} yr`;
}

function updateStatusBar() {
  const span = state.viewEnd - state.viewStart;
  $("status-window").textContent =
    `${fmtFull(state.viewStart)} → ${fmtFull(state.viewEnd)}  (${humanSpan(span)} · step ${humanSpan(span / FETCH_POINTS)})`;
  $("status-hint").textContent = t("hint");
  $("status-ayanamsa").textContent = state.data
    ? `${t("ayanamsa")}: ${state.data.ayanamsa} = ${state.data.ayanamsaValueAtStart.toFixed(4)}°`
    : "";
}

// ---------- Sidebar: location ----------
const locInput = $("loc-input");
const locList = $("loc-list");

function locLabel(c) { return `${c.city}, ${c.state ? c.state + ", " : ""}${c.country}`; }

function showLocDetail() {
  $("loc-detail").textContent =
    `${state.location.lat.toFixed(4)}°, ${state.location.lon.toFixed(4)}° · ${state.location.tz}`;
  locInput.value = locLabel(state.location);
}

function renderLocList(query) {
  const q = query.trim().toLowerCase();
  const matches = q
    ? CITIES.filter((c) => locLabel(c).toLowerCase().includes(q)).slice(0, 12)
    : CITIES.slice(0, 12);
  locList.innerHTML = matches
    .map((c, i) => `<li data-i="${i}">${c.city} <span class="muted">· ${c.state || ""} ${c.country} · ${c.tz}</span></li>`)
    .join("");
  locList.classList.toggle("hidden", matches.length === 0);
  locList._matches = matches;
}

locInput.addEventListener("input", () => renderLocList(locInput.value));
locInput.addEventListener("focus", () => { locInput.select(); renderLocList(""); });
locInput.addEventListener("blur", () => setTimeout(() => { locList.classList.add("hidden"); showLocDetail(); }, 150));
locList.addEventListener("mousedown", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  state.location = locList._matches[Number(li.dataset.i)];
  localStorage.setItem("gochara-loc", JSON.stringify(state.location));
  locList.classList.add("hidden");
  showLocDetail();
  syncRangeInputs();
  draw();
  updateStatusBar();
  scheduleFetch(0);
});

// ---------- Sidebar: range ----------
function syncRangeInputs() {
  $("start-input").value = msToTzInput(state.viewStart, state.location.tz);
  $("end-input").value = msToTzInput(state.viewEnd, state.location.tz);
}

$("apply-btn").addEventListener("click", () => {
  const s = $("start-input").value;
  const e = $("end-input").value;
  if (!s || !e) return;
  // Interpret the datetime-local strings in the selected tz by asking the
  // backend implicitly: approximate here with an iterative offset fix.
  const sMs = tzInputToMs(s), eMs = tzInputToMs(e);
  if (eMs - sMs < MIN_SPAN) return;
  state.viewStart = sMs;
  state.viewEnd = Math.min(eMs, sMs + MAX_SPAN);
  scheduleFetch(0);
});

// "YYYY-MM-DDTHH:MM" in state.location.tz -> epoch ms (two-pass offset fix
// handles DST correctly for practical purposes)
function tzInputToMs(str) {
  const guess = Date.parse(str + "Z");
  const off1 = guess - Date.parse(msToTzInput(guess, state.location.tz) + "Z");
  const adjusted = guess + off1;
  const off2 = adjusted - Date.parse(msToTzInput(adjusted, state.location.tz) + "Z") - off1;
  return adjusted + off2;
}

function renderPresets() {
  $("preset-row").innerHTML = "";
  for (const p of PRESETS) {
    const btn = document.createElement("button");
    btn.textContent = p.label[state.lang];
    btn.addEventListener("click", () => {
      const center = (state.viewStart + state.viewEnd) / 2;
      state.viewStart = center - p.ms / 2;
      state.viewEnd = center + p.ms / 2;
      syncRangeInputs();
      scheduleFetch(0);
    });
    $("preset-row").appendChild(btn);
  }
}

// ---------- Sidebar: y mode, settings ----------
$("ymode-seg").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  state.yMode = btn.dataset.mode;
  for (const b of $("ymode-seg").children) b.classList.toggle("is-active", b === btn);
  draw();
});

$("xgrid-seg").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  state.xGrid = btn.dataset.grid;
  for (const b of $("xgrid-seg").children) b.classList.toggle("is-active", b === btn);
  draw();
});

$("ayanamsa-select").addEventListener("change", (e) => {
  state.ayanamsa = e.target.value;
  scheduleFetch(0);
});
$("node-select").addEventListener("change", (e) => {
  state.nodeType = e.target.value;
  scheduleFetch(0);
});

// ---------- Sidebar: planets ----------
function renderPlanetGrid() {
  const grid = $("planet-grid");
  grid.innerHTML = "";
  for (const p of PLANETS) {
    const card = document.createElement("div");
    card.className = "planet-card" + (state.active.has(p.id) ? "" : " is-off");
    card.innerHTML = `<span class="planet-card__dot" style="background:${p.color}"></span>${p[state.lang]}`;
    card.addEventListener("click", () => {
      if (state.active.has(p.id)) state.active.delete(p.id);
      else state.active.add(p.id);
      card.classList.toggle("is-off", !state.active.has(p.id));
      draw();
    });
    grid.appendChild(card);
  }
}

$("btn-all").addEventListener("click", () => {
  state.active = new Set(PLANETS.map((p) => p.id));
  renderPlanetGrid();
  draw();
});
$("btn-none").addEventListener("click", () => {
  state.active.clear();
  renderPlanetGrid();
  draw();
});

// ---------- Language ----------
function applyLanguage() {
  $("lang-en").classList.toggle("is-active", state.lang === "en");
  $("lang-hi").classList.toggle("is-active", state.lang === "hi");
  $("app-title").textContent = t("title");
  $("app-subtitle").textContent = t("subtitle");
  $("lbl-location").textContent = t("location");
  locInput.placeholder = t("searchCity");
  $("lbl-range").textContent = t("timeRange");
  $("lbl-start").textContent = t("start");
  $("lbl-end").textContent = t("end");
  $("lbl-presets").textContent = t("presets");
  $("apply-btn").textContent = t("apply");
  $("lbl-yaxis").textContent = t("yAxis");
  const [rB, nB, cB] = $("ymode-seg").children;
  rB.textContent = t("rashi"); nB.textContent = t("nakshatra"); cB.textContent = t("charan");
  $("lbl-xgrid").textContent = t("xGrid");
  const [gOff, gDay, gMon, gYr] = $("xgrid-seg").children;
  gOff.textContent = t("gridOff"); gDay.textContent = t("gridDay");
  gMon.textContent = t("gridMonth"); gYr.textContent = t("gridYear");
  $("lbl-settings").textContent = t("settings");
  $("lbl-ayanamsa").textContent = t("ayanamsa");
  $("lbl-node").textContent = t("nodeType");
  $("lbl-bodies").textContent = t("bodies");
  $("btn-all").textContent = t("all");
  $("btn-none").textContent = t("none");
  $("loading").textContent = t("loading");
  renderPresets();
  renderPlanetGrid();
  draw();
  updateStatusBar();
}

$("lang-en").addEventListener("click", () => { state.lang = "en"; localStorage.setItem("gochara-lang", "en"); applyLanguage(); });
$("lang-hi").addEventListener("click", () => { state.lang = "hi"; localStorage.setItem("gochara-lang", "hi"); applyLanguage(); });

// ---------- Wire up ----------
canvas.addEventListener("wheel", onWheel, { passive: false });
canvas.addEventListener("mousedown", onDown);
window.addEventListener("mousemove", onMove);
window.addEventListener("mouseup", onUp);
canvas.addEventListener("mouseleave", () => {
  tooltip.classList.add("hidden");
  clearOverlay();
});
new ResizeObserver(resizeCanvas).observe($("canvas-wrap"));

showLocDetail();
syncRangeInputs();
applyLanguage();
resizeCanvas();
fetchData();
