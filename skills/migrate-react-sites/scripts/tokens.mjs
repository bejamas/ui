// Dump the effective design tokens of a live page: every custom property on :root, the color-mode
// state, and the fonts actually rendered. Use it on the original demo before writing globals.css.
// Usage: node tokens.mjs <url> [--dark] [--storage=theme=dark]
import { launch, parseArgs, storageFlag } from "./browser.mjs";

const { positional: [url], flags } = parseArgs();
const browser = await launch();
const page = await browser.newPage({ dark: !!flags.dark, localStorage: storageFlag(flags) });
await page.goto(url);
await page.wait(1000);
const out = await page.evaluate(() => {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  const vars = {};
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list) => { for (const r of list) { if (r.style) for (const p of r.style) if (p.startsWith("--")) vars[p] = cs.getPropertyValue(p).trim(); if (r.cssRules) walk(r.cssRules); } };
    walk(rules);
  }
  const pick = (sel) => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el); return { fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing, color: s.color, fontVariationSettings: s.fontVariationSettings }; };
  return {
    htmlClass: root.className, htmlStyle: root.getAttribute("style"), colorScheme: cs.colorScheme,
    dataTheme: root.dataset.theme ?? null,
    localStorageTheme: (() => { try { return localStorage.getItem("theme"); } catch { return null; } })(),
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    body: pick("body"), h1: pick("h1"), h2: pick("h2"), p: pick("main p, p"), button: pick("button, a[class*=button]"),
    fontsLoaded: [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight} ${f.style}`),
    vars,
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
