import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { median, round } from "../stats";
import {
  LIGHTHOUSE_METRICS,
  SIDES,
  type FormFactor,
  type LighthouseResult,
  type LighthouseRun,
  type LighthouseValues,
  type Side,
} from "../types";

const AUDITS = {
  fcp: "first-contentful-paint",
  lcp: "largest-contentful-paint",
  tbt: "total-blocking-time",
  cls: "cumulative-layout-shift",
  si: "speed-index",
} as const;

/** Run order for one round. Alternating cancels out drift such as thermal throttling. */
export function roundOrder(run: number): Side[] {
  return run % 2 === 1 ? [...SIDES] : [...SIDES].reverse();
}

export async function runLighthouse({
  urls,
  runs,
  formFactor,
  chromePath,
  reportDir,
  onProgress,
}: {
  urls: Record<Side, string>;
  runs: number;
  formFactor: FormFactor;
  chromePath: string;
  /** Save every full Lighthouse report here, when set. */
  reportDir?: string;
  onProgress: (message: string) => void;
}): Promise<LighthouseResult> {
  const { default: lighthouse, desktopConfig } = await import("lighthouse");
  const { launch } = await import("chrome-launcher");
  const version: string = createRequire(import.meta.url)(
    "lighthouse/package.json",
  ).version;
  if (reportDir) mkdirSync(reportDir, { recursive: true });

  const chrome = await launch({
    chromePath,
    chromeFlags: ["--headless=new", "--disable-dev-shm-usage"],
  });
  const results: Record<Side, LighthouseRun[]> = { original: [], ported: [] };
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
        if (result.lhr.runtimeError) {
          throw new Error(
            `Lighthouse failed for the ${side} URL: ${result.lhr.runtimeError.message}`,
          );
        }
        const report = reportDir
          ? join(reportDir, `${side}-run-${run}.json`)
          : null;
        if (report) {
          writeFileSync(
            report,
            typeof result.report === "string"
              ? result.report
              : JSON.stringify(result.lhr),
          );
        }
        const score = result.lhr.categories.performance?.score;
        const metric = (audit: string) => {
          const value = result.lhr.audits[audit]?.numericValue;
          return typeof value === "number"
            ? round(value, audit === AUDITS.cls ? 4 : 2)
            : null;
        };
        results[side].push({
          run,
          report,
          score: typeof score === "number" ? round(score * 100) : null,
          fcp: metric(AUDITS.fcp),
          lcp: metric(AUDITS.lcp),
          tbt: metric(AUDITS.tbt),
          cls: metric(AUDITS.cls),
          si: metric(AUDITS.si),
        });
      }
    }
  } finally {
    chrome.kill();
  }

  const medians = (side: Side) =>
    Object.fromEntries(
      LIGHTHOUSE_METRICS.map((metric) => {
        const value = median(results[side].map((run) => run[metric]));
        return [
          metric,
          value === null ? null : round(value, metric === "cls" ? 4 : 2),
        ];
      }),
    ) as LighthouseValues;

  return {
    formFactor,
    version,
    runs,
    order: "alternating (original, ported), then (ported, original)",
    original: { runs: results.original, median: medians("original") },
    ported: { runs: results.ported, median: medians("ported") },
  };
}
