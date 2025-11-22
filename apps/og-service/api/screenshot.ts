/* eslint-disable @typescript-eslint/no-explicit-any */
import type { VercelRequest, VercelResponse } from "@vercel/node";

// URL to the Chromium binary package hosted in /public.
// In production we assume Vercel is serving /chromium-pack.tar from this project.
// You can also host it elsewhere and change this URL.
const CHROMIUM_PACK_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/chromium-pack.tar`
  : "https://github.com/gabenunez/puppeteer-on-vercel/raw/refs/heads/main/example/chromium-dont-use-in-prod.tar";

// Base URL for your Astro docs, used when `url` is relative (e.g. `/components/button`)
const DEFAULT_DOCS_BASE_URL = "https://ui-web-nine.vercel.app";
const DOCS_BASE_URL = process.env.DOCS_BASE_URL ?? DEFAULT_DOCS_BASE_URL;

// Always screenshot this element
const PREVIEW_SELECTOR = ".sl-bejamas-component-preview";

// Cache the Chromium executable path to avoid re-downloading on subsequent requests
let cachedExecutablePath: string | null = null;
let downloadPromise: Promise<string> | null = null;

/**
 * Downloads and caches the Chromium executable path.
 * Uses a download promise to prevent concurrent downloads.
 * Only used in real Vercel production (Linux).
 */
async function getChromiumPath(): Promise<string> {
  if (cachedExecutablePath) return cachedExecutablePath;

  if (!downloadPromise) {
    const chromium = (await import("@sparticuz/chromium-min")).default;
    downloadPromise = chromium
      .executablePath(CHROMIUM_PACK_URL)
      .then((path) => {
        cachedExecutablePath = path;
        console.log("Chromium path resolved:", path);
        return path;
      })
      .catch((error) => {
        console.error("Failed to get Chromium path:", error);
        downloadPromise = null; // Reset on error to allow retry
        throw error;
      });
  }

  return downloadPromise;
}

/**
 * Resolve the incoming `url` param to an absolute HTTP(S) URL.
 * - If it starts with http/https → use as-is
 * - Otherwise → treat as path relative to DOCS_BASE_URL
 */
function resolveTargetUrl(rawUrl: string): URL | null {
  const trimmed = rawUrl.trim();

  // Already an absolute http/https URL
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed);
    } catch {
      return null;
    }
  }

  // Treat as relative docs path, e.g. "/components/button"
  try {
    return new URL(trimmed, DOCS_BASE_URL);
  } catch {
    return null;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  let browser: any;

  try {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      res.status(400).send("Missing `url` query param");
      return;
    }

    const targetUrl = resolveTargetUrl(url);
    if (!targetUrl) {
      res.status(400).send("Invalid URL provided.");
      return;
    }

    if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
      res
        .status(400)
        .send("URL must start with http:// or https:// (after resolution).");
      return;
    }

    // Let the docs app know we’re in OG mode (so it can hide nav/sidebar etc.)
    targetUrl.searchParams.set("og", "1");

    // Real Vercel production is Linux with VERCEL=1
    const isVercelProduction =
      process.env.VERCEL === "1" && process.platform === "linux";

    let puppeteer: any;
    let launchOptions: any = {
      headless: true,
      defaultViewport: {
        width: 1200,
        height: 630,
        deviceScaleFactor: 2,
      },
    };

    if (isVercelProduction) {
      // Vercel prod: use puppeteer-core + sparticuz chromium
      const chromium = (await import("@sparticuz/chromium-min")).default;
      puppeteer = await import("puppeteer-core");
      const executablePath = await getChromiumPath();
      launchOptions = {
        ...launchOptions,
        args: chromium.args,
        executablePath,
      };
      console.log("Launching browser with executable path:", executablePath);
    } else {
      // Local dev (and any non-Linux env): use full puppeteer with bundled Chromium
      const p = await import("puppeteer");
      puppeteer = p.default ?? p;
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    await page.goto(targetUrl.toString(), {
      waitUntil: "networkidle2",
      timeout: 15_000,
    });

    // Wait for the component preview and screenshot just that element
    const el = await page.waitForSelector(PREVIEW_SELECTOR, {
      timeout: 5_000,
    });

    if (!el) {
      res
        .status(404)
        .send(
          `Element ${PREVIEW_SELECTOR} not found on ${targetUrl.toString()}`,
        );
      return;
    }

    const screenshot = await capturePreviewScreenshot(page, el);

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'inline; filename="og-image.png"');
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=86400, stale-while-revalidate=604800",
    );

    res.status(200).end(screenshot);
  } catch (error) {
    console.error("OG screenshot error:", error);
    res
      .status(500)
      .send("An error occurred while generating the OG screenshot.");
  } finally {
    if (browser) {
      await browser.close().catch(() => {
        /* ignore */
      });
    }
  }
}

type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Clip = BoundingBox;

async function capturePreviewScreenshot(
  page: any,
  previewHandle: any,
): Promise<Buffer> {
  const childHandles = await previewHandle.$$(":scope > *");

  if (childHandles.length === 0) {
    return (await previewHandle.screenshot({ type: "png" })) as Buffer;
  }

  try {
    const boxes = (
      await Promise.all(childHandles.map((child: any) => child.boundingBox()))
    ).filter(isUsableBoundingBox);

    if (boxes.length === 0) {
      return (await previewHandle.screenshot({ type: "png" })) as Buffer;
    }

    const viewport =
      typeof page.viewport === "function" ? page.viewport() : null;
    const clip = computeClipFromBoxes(boxes, viewport);

    return (await page.screenshot({ type: "png", clip })) as Buffer;
  } finally {
    await Promise.all(childHandles.map((child: any) => child.dispose()));
  }
}

function isUsableBoundingBox(box: BoundingBox | null): box is BoundingBox {
  return (
    box !== null &&
    Number.isFinite(box.x) &&
    Number.isFinite(box.y) &&
    Number.isFinite(box.width) &&
    Number.isFinite(box.height) &&
    box.width > 0 &&
    box.height > 0
  );
}

function computeClipFromBoxes(
  boxes: BoundingBox[],
  viewport: { width: number; height: number } | null,
  padding = 8,
): Clip {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const box of boxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return {
      x: 0,
      y: 0,
      width: viewport?.width ?? 1,
      height: viewport?.height ?? 1,
    };
  }

  const x = Math.max(Math.floor(minX - padding), 0);
  const y = Math.max(Math.floor(minY - padding), 0);
  const widthWithPadding = Math.ceil(maxX - minX + padding * 2);
  const heightWithPadding = Math.ceil(maxY - minY + padding * 2);

  const maxWidth = viewport ? Math.max(viewport.width - x, 1) : null;
  const maxHeight = viewport ? Math.max(viewport.height - y, 1) : null;

  const width =
    maxWidth === null
      ? Math.max(widthWithPadding, 1)
      : Math.max(Math.min(widthWithPadding, maxWidth), 1);

  const height =
    maxHeight === null
      ? Math.max(heightWithPadding, 1)
      : Math.max(Math.min(heightWithPadding, maxHeight), 1);

  return { x, y, width, height };
}
