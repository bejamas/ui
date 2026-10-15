import { createRequire } from "node:module";
import type { Artifacts } from "../artifacts";
import { LIGHTHOUSE } from "../metrics";
import { median, round } from "../stats";
import {
  LIGHTHOUSE_METRICS,
  SIDES,
  type FormFactor,
  type LighthouseMetric,
  type LighthouseResult,
  type LighthouseRun,
  type LighthouseSide,
  type Paired,
  type Side,
} from "../types";

/** The score comes from the performance category, the rest from audits. */
const AUDITS: Record<Exclude<LighthouseMetric, "score">, string> = {
  fcp: "first-contentful-paint",
  lcp: "largest-contentful-paint",
  tbt: "total-blocking-time",
  cls: "cumulative-layout-shift",
  si: "speed-index",
};

/** Run order for one round. Alternating cancels out drift such as thermal throttling. */
export function roundOrder(run: number): Side[] {
  return run % 2 === 1 ? [...SIDES] : [...SIDES].reverse();
}

const roundMetric = (
  metric: LighthouseMetric,
  value: number | null | undefined,
) =>
  typeof value === "number" ? round(value, LIGHTHOUSE[metric].digits) : null;

export async function runLighthouse({
  urls,
  runs,
  formFactor,
  chromePath,
  artifacts,
  onProgress,
}: {
  urls: Paired<string>;
  runs: number;
  formFactor: FormFactor;
  chromePath: string;
  /** Saves every full Lighthouse report, when report files are written. */
  artifacts: Artifacts | undefined;
  onProgress: (message: string) => void;
}): Promise<LighthouseResult> {
  const { default: lighthouse, desktopConfig } = await import("lighthouse");
  const { launch } = await import("chrome-launcher");
  const version: string = createRequire(import.meta.url)(
    "lighthouse/package.json",
  ).version;

  const chrome = await launch({
    chromePath,
    chromeFlags: ["--headless=new", "--disable-dev-shm-usage"],
  });
  const results: Paired<LighthouseRun[]> = { original: [], ported: [] };
  try {
    for (let run = 1; run <= runs; run++) {
      for (const side of roundOrder(run)) {
        onProgress(`Lighthouse ${formFactor} run ${run}/${runs}: ${side}`);
        const result = await lighthouse(
          urls[side],
          {
            port: chrome.port,
            output: "json",
            logLevel: "error",
            onlyCategories: ["performance"],
            throttlingMethod: "simulate",
            maxWaitForLoad: 45_000,
          },
          formFactor === "desktop" ? desktopConfig : undefined,
        );
        if (!result)
          throw new Error(`Lighthouse returned no result for the ${side} URL`);
        const { lhr } = result;
        if (lhr.runtimeError) {
          throw new Error(
            `Lighthouse failed for the ${side} URL: ${lhr.runtimeError.message}`,
          );
        }
        const score = lhr.categories.performance?.score;
        const audit = (metric: keyof typeof AUDITS) =>
          roundMetric(metric, lhr.audits[AUDITS[metric]]?.numericValue);
        results[side].push({
          run,
          report:
            artifacts?.write(
              `lighthouse/${side}-run-${run}.json`,
              typeof result.report === "string"
                ? result.report
                : JSON.stringify(lhr),
            ) ?? null,
          score: roundMetric(
            "score",
            typeof score === "number" ? score * 100 : null,
          ),
          fcp: audit("fcp"),
          lcp: audit("lcp"),
          tbt: audit("tbt"),
          cls: audit("cls"),
          si: audit("si"),
        });
      }
    }
  } finally {
    chrome.kill();
  }

  const summarize = (side: Side): LighthouseSide => ({
    runs: results[side],
    median: Object.fromEntries(
      LIGHTHOUSE_METRICS.map((metric) => [
        metric,
        roundMetric(metric, median(results[side].map((run) => run[metric]))),
      ]),
    ) as LighthouseSide["median"],
  });

  return {
    formFactor,
    version,
    runs,
    order: "alternating (original, ported), then (ported, original)",
    original: summarize("original"),
    ported: summarize("ported"),
  };
}
