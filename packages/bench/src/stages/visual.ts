import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import type { Browser } from "playwright-core";
import { loadPage } from "../browser";
import type {
  Box,
  Capture,
  GeometryComparison,
  LandmarkDifference,
  PixelComparison,
  Side,
  SlotDifference,
  SlotElement,
} from "../types";

export const VISUAL_HEIGHT = 823;

export async function captureVisual(
  browser: Browser,
  {
    side,
    url,
    width,
    timeout,
  }: {
    side: Side;
    url: string;
    width: number;
    timeout: number;
  },
): Promise<{ capture: Capture; image: Buffer }> {
  const context = await browser.newContext({
    viewport: { width, height: VISUAL_HEIGHT },
    colorScheme: "light",
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  try {
    const page = await context.newPage();
    await loadPage(page, url, timeout);
    const image = await page.screenshot({
      fullPage: true,
      animations: "disabled",
    });
    const data = await page.evaluate(() => {
      const round = (value: number) => Math.round(value * 100) / 100;
      const box = (element: Element) => {
        const rect = element.getBoundingClientRect();
        return {
          x: round(rect.x + window.scrollX),
          y: round(rect.y + window.scrollY),
          width: round(rect.width),
          height: round(rect.height),
        };
      };
      const elements = [...document.querySelectorAll("[data-slot]")]
        .filter((element) => element.checkVisibility())
        .map((element) => {
          const { width, height } = box(element);
          return {
            slot: element.getAttribute("data-slot") ?? "",
            text: (element.textContent ?? "").replace(/\s+/g, " ").trim(),
            width,
            height,
          };
        });
      // Page-level regions that are not nested in another region.
      const regions = "header, footer, main, section, article, aside, nav";
      const landmarks = [
        ...document.querySelectorAll("header, footer, main, section"),
      ]
        .filter((element) => element.checkVisibility())
        .filter((element) => {
          const parent = element.parentElement?.closest(regions);
          return !parent || parent.tagName === "MAIN";
        })
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          ...box(element),
        }));
      return {
        elements,
        landmarks,
        pageHeight: document.documentElement.scrollHeight,
      };
    });
    return { capture: { side, width, screenshot: null, ...data }, image };
  } finally {
    await context.close();
  }
}

const slotKey = (element: SlotElement) =>
  `${element.slot}:${element.text.replace(/\s/g, "")}`;

function countBySlot(elements: readonly SlotElement[]) {
  const counts: Record<string, number> = {};
  for (const element of elements)
    counts[element.slot] = (counts[element.slot] ?? 0) + 1;
  return counts;
}

/**
 * Match `data-slot` elements by slot name, normalized text and occurrence
 * order, then compare their sizes. Framework wrappers without a matching
 * element on the other side are reported but not treated as differences.
 */
export function compareGeometry(
  original: Capture,
  ported: Capture,
  tolerance: number,
): GeometryComparison {
  const buckets = new Map<string, SlotElement[]>();
  for (const element of ported.elements) {
    const key = slotKey(element);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(element);
  }
  const differences: SlotDifference[] = [];
  const unmatchedOriginal: SlotElement[] = [];
  let matchedElements = 0;
  for (const element of original.elements) {
    const other = buckets.get(slotKey(element))?.shift();
    if (!other) {
      unmatchedOriginal.push(element);
      continue;
    }
    matchedElements++;
    if (
      Math.abs(element.width - other.width) > tolerance ||
      Math.abs(element.height - other.height) > tolerance
    ) {
      differences.push({
        slot: element.slot,
        text: element.text,
        original: [element.width, element.height],
        ported: [other.width, other.height],
      });
    }
  }

  const landmarkDifferences: LandmarkDifference[] = [];
  const count = Math.max(original.landmarks.length, ported.landmarks.length);
  for (let index = 0; index < count; index++) {
    const a = original.landmarks[index];
    const b = ported.landmarks[index];
    const differs =
      !a ||
      !b ||
      a.tag !== b.tag ||
      (["x", "y", "width", "height"] as const).some(
        (key) => Math.abs(a[key] - b[key]) > tolerance,
      );
    if (differs) {
      const strip = (landmark: typeof a): Box | null =>
        landmark
          ? {
              x: landmark.x,
              y: landmark.y,
              width: landmark.width,
              height: landmark.height,
            }
          : null;
      landmarkDifferences.push({
        index,
        tag: (a ?? b)!.tag,
        original: strip(a),
        ported: strip(b),
      });
    }
  }

  return {
    originalElements: original.elements.length,
    portedElements: ported.elements.length,
    matchedElements,
    differences,
    unmatchedOriginal: countBySlot(unmatchedOriginal),
    unmatchedPorted: countBySlot([...buckets.values()].flat()),
    landmarkDifferences,
  };
}

function crop(png: PNG, width: number, height: number) {
  if (png.width === width && png.height === height) return png.data;
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    png.data.copy(
      data,
      y * width * 4,
      y * png.width * 4,
      (y * png.width + width) * 4,
    );
  }
  return data;
}

/**
 * Pixel-diff the overlapping area of two full-page screenshots. The diff image
 * is returned undecoded so it is only encoded when it gets written.
 */
export function comparePixels(
  original: Buffer,
  ported: Buffer,
): { comparison: PixelComparison; diff: PNG } {
  const a = PNG.sync.read(original);
  const b = PNG.sync.read(ported);
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const diff = new PNG({ width, height });
  const mismatchedPixels = pixelmatch(
    crop(a, width, height),
    crop(b, width, height),
    diff.data,
    width,
    height,
    {
      threshold: 0.1,
    },
  );
  const total = width * height;
  return {
    comparison: {
      diff: null,
      comparedWidth: width,
      comparedHeight: height,
      heightDelta: b.height - a.height,
      mismatchedPixels,
      mismatch:
        total === 0
          ? 0
          : Math.round((mismatchedPixels / total) * 100_000) / 1000,
    },
    diff,
  };
}
