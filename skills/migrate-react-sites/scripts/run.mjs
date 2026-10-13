// Run the same behavior script on the original and the port, headlessly, and compare what it returns.
// The script file holds one (async) function, evaluated in each page after load, e.g.
//   async () => { document.querySelector("[aria-controls]").click(); await new Promise((r) => setTimeout(r, 400));
//     return [...document.querySelectorAll("[aria-expanded]")].map((e) => e.getAttribute("aria-expanded")); }
// Return JSON-serializable state (aria attributes, scroll offsets, active indices, visible text), not pixels.
// Each page gets its own visible headless window: a hidden tab or browser pane stops requestAnimationFrame,
// which stalls primitives' open/close lifecycles and looks like a port bug.
// Usage: node run.mjs <script.js> <url> [url2 …] [--width=1440] [--dark] [--storage=theme=dark] [--allow-status=404] [--ignore-inflight=<regex>]
import { readFileSync } from "node:fs";
import { launch, navFlags, parseArgs, requireArgs, storageFlag, widthArg } from "./browser.mjs";

const { positional: [scriptFile, ...urls], flags } = parseArgs();
requireArgs([scriptFile, urls[0]], "node run.mjs <script.js> <url> [url2 …] [--width=1440] [--dark] [--storage=theme=dark] [--allow-status=404] [--ignore-inflight=<regex>]");
const width = widthArg(flags.width);
const fn = readFileSync(scriptFile, "utf8").trim().replace(/;$/, "");

const browser = await launch();
const results = await Promise.all(urls.map(async (url) => {
  const page = await browser.newPage({ width, dark: !!flags.dark, localStorage: storageFlag(flags) });
  await page.goto(url, navFlags(flags));
  await page.wait(500);
  const value = await page.evaluate(fn);
  await page.close();
  return { url, value };
}));
await browser.close();

for (const { url, value } of results) console.log(`## ${url}\n${JSON.stringify(value, null, 2)}\n`);
if (results.length > 1) {
  const same = results.every((r) => JSON.stringify(r.value) === JSON.stringify(results[0].value));
  console.log(same ? "identical results" : "RESULTS DIFFER");
  process.exitCode = same ? 0 : 1;
}
