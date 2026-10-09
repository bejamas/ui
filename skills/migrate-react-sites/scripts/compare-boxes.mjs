// Compare element geometry and key computed styles between the original site and the port.
// Usage: node compare-boxes.mjs <originalUrl> <portUrl> [width=1440] [--dark] [--storage=theme=dark] [--threshold=2] [--json=out.json]
// Matches elements by tag + normalized text (+ occurrence index) and reports boxes or styles that differ.
import { writeFileSync } from "node:fs";
import { launch, parseArgs, storageFlag } from "./browser.mjs";

const { positional: [origUrl, portUrl, widthArg], flags } = parseArgs();
const width = Number(widthArg ?? 1440);
const threshold = Number(flags.threshold ?? 2);

const SELECTOR = "header, nav, main > *, section, footer, h1, h2, h3, h4, p, a, button, img, svg[role=img], input, textarea, label, li, [data-slot]";
const STYLE_KEYS = ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "color", "backgroundColor", "borderTopWidth", "borderTopStyle", "borderTopColor", "borderRadius", "paddingTop", "paddingLeft", "boxShadow"];

async function collect(browser, url) {
  const page = await browser.newPage({ width, dark: !!flags.dark, reducedMotion: true, localStorage: storageFlag(flags) });
  await page.goto(url);
  await page.scrollThrough(500, 80);
  await page.wait(1500);
  const data = await page.evaluate(({ SELECTOR, STYLE_KEYS }) => {
    const seen = new Map();
    const out = [];
    // Normalize any CSS color syntax (lab, oklch, hsl...) to rgba so serialization differences don't count.
    const ctx = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d", { willReadFrequently: true });
    const norm = (c) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = "#000"; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data; return `rgba(${r},${g},${b},${+(a / 255).toFixed(2)})`; };
    const normAll = (v) => v.replace(/(?:rgba?|hsla?|lab|lch|oklab|oklch|color)\([^()]*\)/g, norm);
    const landmarks = [...document.querySelectorAll("header, nav, main > *, section, footer")];
    for (const el of document.querySelectorAll(SELECTOR)) {
      if (el.closest("[data-compare-ignore]")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const text = (el.getAttribute("aria-label") || el.getAttribute("alt") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 50);
      const tag = el.tagName.toLowerCase();
      // Textless elements (icons, decorative boxes) are keyed by landmark + order instead of text.
      const lm = landmarks.findLastIndex((l) => l === el || l.contains(el));
      const base = text ? `${tag}|${text}` : `${tag}|@landmark${lm}`;
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      const style = {};
      for (const k of STYLE_KEYS) style[k] = cs[k];
      for (const k of ["color", "backgroundColor", "borderTopColor", "boxShadow"]) style[k] = normAll(style[k]);
      // Tailwind v4 stacks transparent shadow layers; treat a shadow made only of transparent layers as none.
      if (style.boxShadow.split(/,(?![^()]*\))/).every((l) => l.includes("rgba(0,0,0,0)") || l.trim() === "none")) style.boxShadow = "none";
      // Ignore properties that can't show: border color/style without width, text color on images.
      if (style.borderTopWidth === "0px") style.borderTopColor = style.borderTopStyle = "-";
      if (tag === "img") style.color = "-";
      style.fontFamily = cs.fontFamily.split(",")[0].replace(/["']/g, "").replace(/-[a-f0-9]{6,}$/i, "").trim();
      out.push({ key: `${base}#${n}`, x: Math.round(r.left), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), style });
    }
    return { height: document.documentElement.scrollHeight, items: out };
  }, { SELECTOR, STYLE_KEYS });
  await page.close();
  return data;
}

const browser = await launch();
const [a, b] = await Promise.all([collect(browser, origUrl), collect(browser, portUrl)]);
await browser.close();

const mapB = new Map(b.items.map((i) => [i.key, i]));
const boxDiffs = [];
const styleDiffs = [];
const missing = [];
for (const ia of a.items) {
  const ib = mapB.get(ia.key);
  if (!ib) { missing.push(ia.key); continue; }
  mapB.delete(ia.key);
  const d = ["x", "y", "w", "h"].map((k) => ib[k] - ia[k]);
  if (d.some((v) => Math.abs(v) > threshold)) boxDiffs.push({ key: ia.key, orig: [ia.x, ia.y, ia.w, ia.h], port: [ib.x, ib.y, ib.w, ib.h], delta: d });
  const sd = Object.keys(ia.style).filter((k) => ia.style[k] !== ib.style[k]).map((k) => `${k}: ${ia.style[k]} → ${ib.style[k]}`);
  if (sd.length) styleDiffs.push({ key: ia.key, diffs: sd });
}
const extra = [...mapB.keys()];

// Report the first drift in document order: later boxes usually inherit its vertical offset.
boxDiffs.sort((p, q) => p.orig[1] - q.orig[1]);
console.log(`page height: original ${a.height}px, port ${b.height}px (Δ ${b.height - a.height})  @ ${width}px ${flags.dark ? "dark" : "light"}${flags.storage ? `, localStorage ${flags.storage}` : ""}`);
console.log(`matched ${a.items.length - missing.length}/${a.items.length} original elements; ${boxDiffs.length} box diffs > ${threshold}px; ${styleDiffs.length} style diffs; ${missing.length} missing; ${extra.length} extra in port`);
console.log("\n## Box diffs (document order; fix the first one, then re-run)");
for (const d of boxDiffs.slice(0, 40)) console.log(`${d.key}\n   orig x,y,w,h ${d.orig.join(",")}  port ${d.port.join(",")}  Δ ${d.delta.join(",")}`);
console.log("\n## Style diffs");
for (const d of styleDiffs.slice(0, 40)) console.log(`${d.key}\n   ${d.diffs.join("\n   ")}`);
console.log("\n## Missing in port (first 30)\n" + missing.slice(0, 30).join("\n"));
console.log("\n## Extra in port (first 30)\n" + extra.slice(0, 30).join("\n"));
if (flags.json) writeFileSync(flags.json, JSON.stringify({ a, b, boxDiffs, styleDiffs, missing, extra }, null, 2));
