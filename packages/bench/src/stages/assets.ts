import { gzipSync } from "node:zlib";
import type { Browser, Request } from "playwright-core";
import { bothSides } from "../sides";
import {
  ASSET_CATEGORIES,
  type AssetCategory,
  type AssetEntry,
  type AssetSummary,
  type AssetsResult,
  type Paired,
  type SideAssets,
} from "../types";

export const ASSETS_VIEWPORT = { width: 412, height: 823 };

const COMPRESSIBLE = new Set<AssetCategory>(["html", "css", "js"]);

export function categorize(
  request: Pick<Request, "resourceType" | "isNavigationRequest">,
  isMainFrame: boolean,
): AssetCategory {
  switch (request.resourceType()) {
    case "document":
      return isMainFrame && request.isNavigationRequest() ? "html" : "other";
    case "stylesheet":
      return "css";
    case "script":
      return "js";
    case "font":
      return "fonts";
    case "image":
    case "media":
      return "images";
    default:
      return "other";
  }
}

const sum = (
  entries: readonly AssetEntry[],
  read: (entry: AssetEntry) => number,
) => entries.reduce((total, entry) => total + read(entry), 0);

export function summarizeAssets(entries: readonly AssetEntry[]) {
  const categories = Object.fromEntries(
    ASSET_CATEGORIES.map((category) => {
      const files = entries.filter((entry) => entry.category === category);
      const summary: AssetSummary = {
        count: files.length,
        transfer: sum(files, (entry) => entry.transfer),
        raw: sum(files, (entry) => entry.raw),
        size: COMPRESSIBLE.has(category)
          ? sum(files, (entry) => entry.gzip ?? 0)
          : sum(files, (entry) => entry.transfer),
      };
      return [category, summary];
    }),
  ) as Record<AssetCategory, AssetSummary>;
  return {
    categories,
    coreSize: (["html", "css", "js", "fonts"] as const).reduce(
      (total, category) => total + categories[category].size,
      0,
    ),
    requests: entries.length,
    transfer: sum(entries, (entry) => entry.transfer),
  };
}

/**
 * Record every response of a cold page load. Compression is recomputed from
 * the decoded bodies so local and remote servers are measured the same way.
 */
export function measureAssets(
  browser: Browser,
  urls: Paired<string>,
  timeout: number,
): Promise<AssetsResult> {
  return bothSides((side) => measureSide(browser, urls[side], timeout));
}

async function measureSide(
  browser: Browser,
  url: string,
  timeout: number,
): Promise<SideAssets> {
  const context = await browser.newContext({
    viewport: ASSETS_VIEWPORT,
    serviceWorkers: "block",
  });
  try {
    const page = await context.newPage();
    const pending: Promise<Omit<AssetEntry, "thirdParty"> | null>[] = [];
    page.on("requestfinished", (request) => {
      pending.push(
        (async () => {
          const response = await request.response();
          if (
            !response ||
            response.status() >= 300 ||
            response.status() === 204
          )
            return null;
          const category = categorize(
            request,
            request.frame() === page.mainFrame(),
          );
          const [sizes, body] = await Promise.all([
            request.sizes(),
            response.body().catch(() => null),
          ]);
          return {
            url: request.url(),
            category,
            transfer: sizes.responseBodySize,
            raw: body?.byteLength ?? 0,
            gzip:
              body && COMPRESSIBLE.has(category)
                ? gzipSync(body, { level: 9 }).byteLength
                : null,
          };
        })().catch(() => null),
      );
    });
    await page.goto(url, { waitUntil: "networkidle", timeout });
    const finalUrl = page.url();
    const origin = new URL(finalUrl).origin;
    const entries = (await Promise.all(pending))
      .filter((entry) => entry !== null)
      .filter((entry) => !entry.url.startsWith("data:"))
      .map((entry) => ({
        ...entry,
        thirdParty: new URL(entry.url).origin !== origin,
      }))
      .sort(
        (a, b) =>
          a.category.localeCompare(b.category) || a.url.localeCompare(b.url),
      );
    return {
      finalUrl,
      viewport: ASSETS_VIEWPORT,
      ...summarizeAssets(entries),
      entries,
    };
  } finally {
    await context.close();
  }
}
