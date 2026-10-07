import { Launcher } from "chrome-launcher";
import type { Browser, Page } from "playwright-core";
import { BenchError } from "./errors";

export function resolveChromePath(explicit?: string) {
  const chromePath =
    explicit ?? process.env.CHROME_PATH ?? Launcher.getFirstInstallation();
  if (!chromePath) {
    throw new BenchError(
      "Google Chrome was not found. Install Chrome, pass --chrome-path or set CHROME_PATH.",
    );
  }
  return chromePath;
}

export async function launchBrowser(chromePath: string): Promise<Browser> {
  const { chromium } = await import("playwright-core");
  return chromium.launch({ executablePath: chromePath, headless: true });
}

/**
 * Load a page until the network is idle, then scroll through it so lazy images
 * and scroll-triggered content render before anything is measured.
 */
export async function loadPage(page: Page, url: string, timeout: number) {
  await page.goto(url, { waitUntil: "networkidle", timeout });
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    const pause = () => new Promise((resolve) => setTimeout(resolve, 50));
    // Cap the distance so infinite-scroll pages still finish.
    const limit = 100_000;
    for (
      let y = 0;
      y < Math.min(document.documentElement.scrollHeight, limit);
      y += step
    ) {
      window.scrollTo(0, y);
      await pause();
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
  await page.waitForLoadState("networkidle", { timeout }).catch(() => {});
}
