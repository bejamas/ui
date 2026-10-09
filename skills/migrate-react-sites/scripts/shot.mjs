// Viewport-sized screenshots of a whole page, top to bottom: <out>-1.png, <out>-2.png ...
// Each slice is taken scrolled to that position, so sticky headers and scroll-linked effects show as a visitor sees them.
// Usage: node shot.mjs <url> <out.png> [width=1440] [--dark] [--storage=theme=dark]
import { writeFileSync } from "node:fs";
import { launch, parseArgs, storageFlag } from "./browser.mjs";

const { positional: [url, out, widthArg], flags } = parseArgs();
const browser = await launch();
const page = await browser.newPage({ width: Number(widthArg ?? 1440), dark: !!flags.dark, localStorage: storageFlag(flags) });
await page.goto(url);
await page.scrollThrough(400, 120);
await page.wait(1200);
const total = await page.evaluate(() => document.documentElement.scrollHeight);
const files = [];
for (let i = 0, y = 0; y < total; i++, y += page.height) {
  await page.evaluate((y) => scrollTo(0, y), y);
  await page.wait(300);
  const file = out.replace(/\.png$/, "") + `-${i + 1}.png`;
  writeFileSync(file, await page.screenshot());
  files.push(file);
}
await browser.close();
console.log(`saved ${files.length} slices (${page.width}px, page ${total}px): ${files.join(" ")}`);
