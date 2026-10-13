// Dump the effective design tokens of a live page: every custom property on :root, the color-mode
// state, and the fonts actually rendered. Use it on the original demo before writing globals.css.
// Usage: node tokens.mjs <url> [--dark] [--storage=theme=dark]
import { launch, parseArgs, requireArgs, storageFlag } from "./browser.mjs";

const { positional: [url], flags } = parseArgs();
requireArgs([url], "node tokens.mjs <url> [--dark] [--storage=theme=dark]");
const browser = await launch();
const page = await browser.newPage({ dark: !!flags.dark, localStorage: storageFlag(flags) });
await page.goto(url);
await page.wait(1000);
const out = await page.evaluate(() => {
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  // vars: custom properties as :root computes them. Ones that don't resolve on :root are declared on
  // other elements (sidebar, component scopes); scopedVars lists those with their selector and raw value.
  // Tailwind's internal --tw-* properties are skipped.
  const vars = {};
  const scopedVars = {};
  const unreadableSheets = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { unreadableSheets.push(sheet.href); continue; }
    const walk = (list) => {
      for (const r of list) {
        if (r.style) for (const p of r.style) {
          if (!p.startsWith("--") || p.startsWith("--tw-")) continue;
          const value = cs.getPropertyValue(p).trim();
          if (value) vars[p] = value;
          else (scopedVars[p] ??= []).push(`${r.selectorText ?? "?"} { ${r.style.getPropertyValue(p).trim()} }`);
        }
        if (r.cssRules) walk(r.cssRules);
      }
    };
    walk(rules);
  }
  for (const p of Object.keys(vars)) delete scopedVars[p];
  for (const [p, decls] of Object.entries(scopedVars)) if (decls.length > 4) scopedVars[p] = [...decls.slice(0, 4), `… ${decls.length - 4} more`];
  const pick = (sel) => { const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el); return { fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing, color: s.color, fontVariationSettings: s.fontVariationSettings }; };
  return {
    htmlClass: root.className, htmlStyle: root.getAttribute("style"), colorScheme: cs.colorScheme,
    dataTheme: root.dataset.theme ?? null,
    localStorageTheme: (() => { try { return localStorage.getItem("theme"); } catch { return null; } })(),
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    body: pick("body"), h1: pick("h1"), h2: pick("h2"), p: pick("main p, p"), button: pick("button, a[class*=button]"),
    fontsLoaded: [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight} ${f.style}`),
    vars, scopedVars,
    // Cross-origin stylesheets can't be read; tokens defined there are missing from vars.
    unreadableSheets,
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
