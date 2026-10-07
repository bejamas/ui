import {
  brotliCompressSync,
  constants as zlibConstants,
  gzipSync,
} from "node:zlib";
import type { Browser, Request } from "playwright-core";
import {
  ASSET_CATEGORIES,
  type AssetCategory,
  type AssetEntry,
  type AssetSummary,
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

export function compress(body: Buffer) {
  return {
    gzip: gzipSync(body, { level: 9 }).byteLength,
    brotli: brotliCompressSync(body, {
      params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
    }).byteLength,
  };
}

export function summarizeAssets(entries: readonly AssetEntry[]) {
  const categories = Object.fromEntries(
    ASSET_CATEGORIES.map((category) => {
      const files = entries.filter((entry) => entry.category === category);
      const compressible = COMPRESSIBLE.has(category);
      const summary: AssetSummary = {
        count: files.length,
        transfer: files.reduce((sum, entry) => sum + entry.transfer, 0),
        raw: files.reduce((sum, entry) => sum + entry.raw, 0),
        gzip: compressible
          ? files.reduce((sum, entry) => sum + (entry.gzip ?? 0), 0)
          : null,
        brotli: compressible
          ? files.reduce((sum, entry) => sum + (entry.brotli ?? 0), 0)
          : null,
      };
      return [category, summary];
    }),
  ) as Record<AssetCategory, AssetSummary>;
  return {
    categories,
    coreGzip:
      categories.html.gzip! +
      categories.css.gzip! +
      categories.js.gzip! +
      categories.fonts.transfer,
    requests: entries.length,
    transfer: entries.reduce((sum, entry) => sum + entry.transfer, 0),
  };
}

/**
 * Record every response of a cold page load. Compression is recomputed from
 * the decoded bodies so local and remote servers are measured the same way.
 */
export async function measureAssets(
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
          const raw = body?.byteLength ?? 0;
          const compressed =
            body && COMPRESSIBLE.has(category) ? compress(body) : null;
          return {
            url: request.url(),
            category,
            transfer: sizes.responseBodySize,
            raw,
            gzip: compressed?.gzip ?? null,
            brotli: compressed?.brotli ?? null,
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
