import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { PNG } from "pngjs";
import { qualityChecks, visualChecks } from "../src/checks";
import { categorize, summarizeAssets } from "../src/stages/assets";
import { roundOrder } from "../src/stages/lighthouse";
import { compareText } from "../src/stages/quality";
import { comparePixels, compareGeometry } from "../src/stages/visual";
import type {
  AssetEntry,
  Capture,
  QualityResult,
  SideQuality,
  VisualResult,
} from "../src/types";

describe("assets", () => {
  test("categorizes requests by resource type", () => {
    const request = (type: string, navigation = false) => ({
      resourceType: () => type,
      isNavigationRequest: () => navigation,
    });
    expect(categorize(request("document", true), true)).toBe("html");
    expect(categorize(request("document", true), false)).toBe("other");
    expect(categorize(request("script"), true)).toBe("js");
    expect(categorize(request("stylesheet"), true)).toBe("css");
    expect(categorize(request("font"), true)).toBe("fonts");
    expect(categorize(request("image"), true)).toBe("images");
    expect(categorize(request("fetch"), true)).toBe("other");
  });

  test("totals HTML, CSS and JS gzip estimates plus encoded fonts", () => {
    const entry = (
      category: AssetEntry["category"],
      transfer: number,
      gzip: number | null,
    ): AssetEntry => ({
      url: `https://a.test/${category}`,
      category,
      thirdParty: false,
      transfer,
      raw: transfer * 2,
      gzip,
      brotli: gzip,
    });
    const summary = summarizeAssets([
      entry("html", 50, 40),
      entry("css", 100, 80),
      entry("js", 300, 250),
      entry("js", 200, 150),
      entry("fonts", 1000, null),
      entry("images", 5000, null),
    ]);
    expect(summary.categories.js).toEqual({
      count: 2,
      transfer: 500,
      raw: 1000,
      gzip: 400,
      brotli: 400,
    });
    expect(summary.categories.fonts.gzip).toBeNull();
    expect(summary.coreGzip).toBe(40 + 80 + 400 + 1000);
    expect(summary.requests).toBe(6);
    expect(summary.transfer).toBe(6650);
  });
});

test("Lighthouse alternates the run order", () => {
  expect([1, 2, 3].map(roundOrder)).toEqual([
    ["original", "ported"],
    ["ported", "original"],
    ["original", "ported"],
  ]);
});

describe("compareText", () => {
  test("reports identical text", () => {
    expect(compareText("a b c", "a b c")).toEqual({
      identical: true,
      originalWords: 3,
      portedWords: 3,
    });
  });

  test("shows context around the first differing region", () => {
    const result = compareText(
      "one two three four five",
      "one two 3 four five",
    );
    expect(result.identical).toBe(false);
    expect(result.original).toBe("one two three four five");
    expect(result.ported).toBe("one two 3 four five");
  });

  test("truncates long context", () => {
    const words = Array.from({ length: 100 }, (_, index) => `w${index}`);
    const changed = [...words];
    changed[50] = "changed";
    const result = compareText(words.join(" "), changed.join(" "));
    expect(result.original).toStartWith("… w38");
    expect(result.original).toContain("w50");
    expect(result.ported).toContain("changed");
    expect(result.ported).toEndWith("w62 …");
  });
});

const capture = (
  side: Capture["side"],
  overrides: Partial<Capture> = {},
): Capture => ({
  side,
  width: 412,
  screenshot: "",
  pageHeight: 1000,
  elements: [
    { slot: "button", text: "Buy now", width: 100, height: 40 },
    { slot: "button", text: "Buy now", width: 100, height: 40 },
    { slot: "card", text: "Plan", width: 300, height: 200 },
  ],
  landmarks: [
    { tag: "header", x: 0, y: 0, width: 412, height: 64 },
    { tag: "main", x: 0, y: 64, width: 412, height: 900 },
  ],
  ...overrides,
});

describe("compareGeometry", () => {
  test("matches components by slot, text and occurrence", () => {
    const ported = capture("ported", {
      elements: [
        { slot: "button", text: "Buy now", width: 100.4, height: 40 },
        { slot: "button", text: "Buy  now", width: 104, height: 40 },
        { slot: "island", text: "", width: 10, height: 10 },
      ],
    });
    const result = compareGeometry(capture("original"), ported, 0.5);
    expect(result.matchedElements).toBe(2);
    expect(result.differences).toEqual([
      {
        slot: "button",
        text: "Buy now",
        original: [100, 40],
        ported: [104, 40],
      },
    ]);
    expect(result.unmatchedOriginal).toEqual({ card: 1 });
    expect(result.unmatchedPorted).toEqual({ island: 1 });
    expect(result.landmarkDifferences).toEqual([]);
  });

  test("reports moved, resized and missing regions", () => {
    const ported = capture("ported", {
      landmarks: [{ tag: "header", x: 0, y: 0, width: 412, height: 72 }],
    });
    const result = compareGeometry(capture("original"), ported, 0.5);
    expect(result.landmarkDifferences).toEqual([
      {
        index: 0,
        tag: "header",
        original: { x: 0, y: 0, width: 412, height: 64 },
        ported: { x: 0, y: 0, width: 412, height: 72 },
      },
      {
        index: 1,
        tag: "main",
        original: { x: 0, y: 64, width: 412, height: 900 },
        ported: null,
      },
    ]);
  });
});

describe("comparePixels", () => {
  function png(
    path: string,
    width: number,
    height: number,
    paint: (x: number, y: number) => number,
  ) {
    const image = new PNG({ width, height });
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const offset = (y * width + x) * 4;
        image.data.fill(paint(x, y), offset, offset + 3);
        image.data[offset + 3] = 255;
      }
    }
    writeFileSync(path, PNG.sync.write(image));
  }

  test("compares the overlapping area and reports the height change", () => {
    const dir = mkdtempSync(join(tmpdir(), "bench-pixels-"));
    png(join(dir, "a.png"), 10, 10, () => 255);
    png(join(dir, "b.png"), 10, 12, (x, y) => (x < 5 && y < 2 ? 0 : 255));
    const result = comparePixels(
      join(dir, "a.png"),
      join(dir, "b.png"),
      join(dir, "diff.png"),
    );
    expect(result).toEqual({
      diff: join(dir, "diff.png"),
      comparedWidth: 10,
      comparedHeight: 10,
      heightDelta: 2,
      mismatchedPixels: 10,
      mismatch: 10,
    });
  });
});

function side(overrides: Partial<SideQuality> = {}): SideQuality {
  return {
    finalUrl: "http://localhost:3000/",
    title: "Home",
    description: "About us",
    lang: "en",
    text: "Hello world",
    textHash: "",
    headings: [{ level: 1, text: "Hello" }],
    domElements: 10,
    domBytes: 100,
    nestedInteractiveControls: 0,
    violations: [],
    errors: [],
    failedRequests: [],
    ...overrides,
  };
}

describe("qualityChecks", () => {
  const statuses = (result: QualityResult) =>
    Object.fromEntries(
      qualityChecks(result).map((check) => [check.id, check.status]),
    );

  test("passes identical pages", () => {
    const original = side();
    const ported = side({ finalUrl: "http://localhost:4321/" });
    expect(
      statuses({
        viewport: { width: 1, height: 1 },
        original,
        ported,
        text: compareText(original.text, ported.text),
      }),
    ).toEqual({
      text: "pass",
      metadata: "pass",
      headings: "pass",
      accessibility: "pass",
      errors: "pass",
      "nested-controls": "pass",
    });
  });

  test("flags regressions but not problems the original already had", () => {
    const shared = {
      id: "color-contrast",
      impact: "serious",
      help: "Contrast",
      nodes: 2,
    };
    const original = side({
      violations: [shared],
      failedRequests: ["http://localhost:3000/missing.png (HTTP 404)"],
    });
    const ported = side({
      finalUrl: "http://localhost:4321/",
      title: "Home | New",
      headings: [{ level: 2, text: "Hello" }],
      violations: [
        shared,
        {
          id: "image-alt",
          impact: "critical",
          help: "Images need alt",
          nodes: 1,
        },
      ],
      failedRequests: ["http://localhost:4321/missing.png (HTTP 404)"],
      nestedInteractiveControls: 1,
    });
    const checks = qualityChecks({
      viewport: { width: 1, height: 1 },
      original,
      ported,
      text: compareText("a", "a"),
    });
    const byId = Object.fromEntries(checks.map((check) => [check.id, check]));
    expect(byId.metadata!.status).toBe("fail");
    expect(byId.headings!.detail).toContain("“h1 Hello” vs “h2 Hello”");
    expect(byId.accessibility!.status).toBe("fail");
    expect(byId.accessibility!.detail).toContain("image-alt (1)");
    expect(byId.errors!.status).toBe("warn");
    expect(byId["nested-controls"]!.status).toBe("fail");
  });
});

test("visualChecks warns when no components matched", () => {
  const visual = {
    tolerance: 0.5,
    captures: [],
    widths: [
      {
        width: 412,
        ...compareGeometry(
          capture("original", { elements: [] }),
          capture("ported", { elements: [] }),
          0.5,
        ),
        pixels: {
          diff: "",
          comparedWidth: 1,
          comparedHeight: 1,
          heightDelta: 0,
          mismatchedPixels: 0,
          mismatch: 0,
        },
      },
    ],
  } satisfies VisualResult;
  expect(visualChecks(visual).map((check) => [check.id, check.status])).toEqual(
    [
      ["geometry-412", "warn"],
      ["pixels-412", "pass"],
    ],
  );
});
