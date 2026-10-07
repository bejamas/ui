import { describe, expect, test } from "bun:test";
import { evaluateBudgets, parseBudgets } from "../src/budgets";
import { summarizeAssets } from "../src/stages/assets";
import type {
  AssetEntry,
  LighthouseResult,
  LighthouseValues,
  SideAssets,
  VisualResult,
} from "../src/types";

describe("parseBudgets", () => {
  test("parses comma-separated and repeated budgets with units", () => {
    expect(
      parseBudgets([
        "lcp>10%,js>0",
        "total>20kb",
        "score<-5",
        "tbt>0.2s",
        "pixels>1%",
      ]),
    ).toEqual([
      { source: "lcp>10%", metric: "lcp", op: ">", value: 10, relative: true },
      { source: "js>0", metric: "js", op: ">", value: 0, relative: false },
      {
        source: "total>20kb",
        metric: "total",
        op: ">",
        value: 20 * 1024,
        relative: false,
      },
      {
        source: "score<-5",
        metric: "score",
        op: "<",
        value: -5,
        relative: false,
      },
      {
        source: "tbt>0.2s",
        metric: "tbt",
        op: ">",
        value: 200,
        relative: false,
      },
      {
        source: "pixels>1%",
        metric: "pixels",
        op: ">",
        value: 1,
        relative: false,
      },
    ]);
  });

  test("rejects unknown metrics, bad syntax and mismatched units", () => {
    expect(() => parseBudgets(["foo>1"])).toThrow(
      'Unknown budget metric "foo"',
    );
    expect(() => parseBudgets(["lcp=>1"])).toThrow("Invalid budget");
    expect(() => parseBudgets(["lcp>5kb"])).toThrow(
      'Unit "kb" does not apply to lcp',
    );
    expect(() => parseBudgets(["js>5ms"])).toThrow(
      'Unit "ms" does not apply to js',
    );
  });
});

function assets(js: number): SideAssets {
  const entries: AssetEntry[] = [
    {
      url: "https://a.test/",
      category: "html",
      thirdParty: false,
      transfer: 100,
      raw: 300,
      gzip: 100,
      brotli: 90,
    },
    {
      url: "https://a.test/app.js",
      category: "js",
      thirdParty: false,
      transfer: js,
      raw: js * 3,
      gzip: js,
      brotli: js,
    },
  ];
  return {
    finalUrl: "https://a.test/",
    viewport: { width: 412, height: 823 },
    ...summarizeAssets(entries),
    entries,
  };
}

const values = (lcp: number): LighthouseValues => ({
  score: 90,
  fcp: 1000,
  lcp,
  tbt: 0,
  cls: 0,
  si: 1000,
});
const lighthouse = (original: number, ported: number) =>
  ({
    original: { runs: [], median: values(original) },
    ported: { runs: [], median: values(ported) },
  }) as unknown as LighthouseResult;

describe("evaluateBudgets", () => {
  const comparable = { comparable: true, reasons: [] };

  test("compares absolute and relative changes", () => {
    const results = evaluateBudgets(parseBudgets(["js>0,lcp>10%,lcp>500ms"]), {
      assets: { original: assets(1000), ported: assets(1200) },
      lighthouse: lighthouse(2000, 2300),
      comparability: comparable,
    });
    expect(results.map((result) => result.status)).toEqual([
      "fail",
      "fail",
      "pass",
    ]);
    expect(results[0]!.detail).toBe("js: 1000 B → 1.17 KiB (+200 B)");
    expect(results[1]!.detail).toBe("lcp: 2.00 s → 2.30 s (+15%)");
  });

  test("passes improvements", () => {
    const [result] = evaluateBudgets(parseBudgets(["total>0"]), {
      assets: { original: assets(1200), ported: assets(1000) },
      comparability: comparable,
    });
    expect(result!.status).toBe("pass");
  });

  test("skips timing budgets when the URLs are not comparable or stages did not run", () => {
    const results = evaluateBudgets(
      parseBudgets(["lcp>10%", "js>0", "pixels>1%"]),
      {
        lighthouse: lighthouse(2000, 4000),
        comparability: { comparable: false, reasons: ["local vs remote"] },
      },
    );
    expect(results.map((result) => [result.status, result.detail])).toEqual([
      ["skip", "timings are not comparable between these URLs"],
      ["skip", "the assets stage did not run"],
      ["skip", "the visual stage did not run"],
    ]);
  });

  test("uses the worst pixel mismatch across widths", () => {
    const visual = {
      widths: [
        { width: 412, pixels: { mismatch: 0.5 } },
        { width: 1280, pixels: { mismatch: 2.25 } },
      ],
    } as unknown as VisualResult;
    const [result] = evaluateBudgets(parseBudgets(["pixels>1%"]), {
      visual,
      comparability: comparable,
    });
    expect(result).toEqual({
      budget: "pixels>1%",
      status: "fail",
      detail: "2.25% of pixels differ at 1280px",
    });
  });
});
