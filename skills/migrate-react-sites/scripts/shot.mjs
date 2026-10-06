// Usage: bun /tmp/bui-ports/_tools/shot.mjs <url> <out.png> [width=1440] [--dark]
// Full-page screenshot (add --chunks to also save viewport-height slices out-1.png, out-2.png ...). Scrolls through the page first so in-view animations run.
import { chromium } from "playwright";
const [url, out, widthArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const dark = process.argv.includes("--dark");
const width = Number(widthArg ?? 1440);
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width, height: width < 768 ? 844 : 900 },
  colorScheme: dark ? "dark" : "light",
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
});
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
const h = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < h; y += 400) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(120); }
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(1200);
await page.screenshot({ path: out, fullPage: true });
if (process.argv.includes("--chunks")) {
  const vh = page.viewportSize().height;
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let i = 0, y = 0; y < total; i++, y += vh) {
    const p = out.replace(/\.png$/, `-${i + 1}.png`);
    await page.screenshot({ path: p, fullPage: true, clip: { x: 0, y, width, height: Math.min(vh, total - y) } });
  }
}
await browser.close();
console.log(`saved ${out} (${width}px)`);
