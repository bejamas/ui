import { BenchError } from "./errors";
import { formatBytes, formatMs } from "./format";
import { round } from "./stats";
import type {
  AssetsResult,
  BudgetResult,
  Comparability,
  LighthouseMetric,
  LighthouseResult,
  VisualResult,
} from "./types";

type SizeMetric = "js" | "css" | "html" | "fonts" | "total";
export type BudgetMetric =
  LighthouseMetric | SizeMetric | "requests" | "pixels";

export interface Budget {
  source: string;
  metric: BudgetMetric;
  op: ">" | "<";
  value: number;
  /** Compare the relative change in percent instead of the absolute change. */
  relative: boolean;
}

const TIME_METRICS = new Set<BudgetMetric>(["fcp", "lcp", "tbt", "si"]);
const SIZE_METRICS = new Set<BudgetMetric>([
  "js",
  "css",
  "html",
  "fonts",
  "total",
]);
const METRICS = new Set<BudgetMetric>([
  "score",
  "fcp",
  "lcp",
  "tbt",
  "cls",
  "si",
  ...SIZE_METRICS,
  "requests",
  "pixels",
]);
const UNIT_FACTORS: Record<string, number> = {
  b: 1,
  kb: 1024,
  kib: 1024,
  mb: 1024 ** 2,
  mib: 1024 ** 2,
  ms: 1,
  s: 1000,
};

export const BUDGET_HELP = `Budgets compare the ported URL with the original. Size and timing budgets
use the change (ported − original), absolute or relative with %:
  lcp>10%     fail when LCP grows by more than 10%
  js>0        fail when route JavaScript (gzip) grows at all
  total>20kb  fail when HTML + CSS + JS + fonts grow by more than 20 KiB
  score<-5    fail when the Lighthouse score drops by more than 5 points
  pixels>1%   fail when screenshots differ in more than 1% of pixels (absolute)
Metrics: score, fcp, lcp, tbt, cls, si, js, css, html, fonts, total, requests, pixels.`;

export function parseBudgets(inputs: readonly string[]): Budget[] {
  return inputs
    .flatMap((input) => input.split(","))
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseBudget);
}

function parseBudget(source: string): Budget {
  const match = source.match(
    /^([a-z]+)\s*([<>])\s*(-?\d+(?:\.\d+)?)\s*(%|[a-z]+)?$/i,
  );
  if (!match)
    throw new BenchError(
      `Invalid budget "${source}". Expected <metric><op><value>, e.g. lcp>10%.`,
    );
  const metric = match[1]!.toLowerCase() as BudgetMetric;
  const unit = match[4]?.toLowerCase();
  if (!METRICS.has(metric)) {
    throw new BenchError(
      `Unknown budget metric "${metric}" in "${source}". ${[...METRICS].join(", ")} are supported.`,
    );
  }
  let value = Number(match[3]);
  if (unit && unit !== "%") {
    const factor = UNIT_FACTORS[unit];
    const fits =
      factor !== undefined &&
      ((SIZE_METRICS.has(metric) &&
        ["b", "kb", "kib", "mb", "mib"].includes(unit)) ||
        (TIME_METRICS.has(metric) && ["ms", "s"].includes(unit)));
    if (!fits)
      throw new BenchError(
        `Unit "${unit}" does not apply to ${metric} in "${source}".`,
      );
    value *= factor;
  }
  return {
    source,
    metric,
    op: match[2] as ">" | "<",
    value,
    relative: unit === "%" && metric !== "pixels",
  };
}

export interface BudgetInputs {
  assets?: AssetsResult;
  lighthouse?: LighthouseResult;
  visual?: VisualResult;
  comparability: Comparability;
}

type Pair = { original: number; ported: number };

function format(metric: BudgetMetric, value: number) {
  if (TIME_METRICS.has(metric)) return formatMs(value);
  if (SIZE_METRICS.has(metric)) return formatBytes(value);
  return String(round(value, 3));
}

function readPair(metric: BudgetMetric, inputs: BudgetInputs): Pair | string {
  if (SIZE_METRICS.has(metric) || metric === "requests") {
    const { assets } = inputs;
    if (!assets) return "the assets stage did not run";
    const read = (side: "original" | "ported") => {
      const data = assets[side];
      if (metric === "requests") return data.requests;
      if (metric === "total") return data.coreGzip;
      if (metric === "fonts") return data.categories.fonts.transfer;
      return data.categories[metric as "js" | "css" | "html"].gzip ?? 0;
    };
    return { original: read("original"), ported: read("ported") };
  }
  const { lighthouse, comparability } = inputs;
  if (!lighthouse) return "the Lighthouse stage did not run";
  if (!comparability.comparable)
    return "timings are not comparable between these URLs";
  const original = lighthouse.original.median[metric as LighthouseMetric];
  const ported = lighthouse.ported.median[metric as LighthouseMetric];
  if (original === null || ported === null)
    return `Lighthouse did not report ${metric}`;
  return { original, ported };
}

export function evaluateBudgets(
  budgets: readonly Budget[],
  inputs: BudgetInputs,
): BudgetResult[] {
  return budgets.map((budget) => {
    const exceeds = (actual: number) =>
      budget.op === ">" ? actual > budget.value : actual < budget.value;

    if (budget.metric === "pixels") {
      const widths = inputs.visual?.widths ?? [];
      if (widths.length === 0)
        return {
          budget: budget.source,
          status: "skip",
          detail: "the visual stage did not run",
        };
      const worst = widths.reduce((a, b) =>
        b.pixels.mismatch > a.pixels.mismatch ? b : a,
      );
      return {
        budget: budget.source,
        status: exceeds(worst.pixels.mismatch) ? "fail" : "pass",
        detail: `${round(worst.pixels.mismatch, 3)}% of pixels differ at ${worst.width}px`,
      };
    }

    const pair = readPair(budget.metric, inputs);
    if (typeof pair === "string")
      return { budget: budget.source, status: "skip", detail: pair };
    const delta = pair.ported - pair.original;
    const relative =
      pair.original === 0
        ? delta === 0
          ? 0
          : Math.sign(delta) * Infinity
        : (delta / pair.original) * 100;
    const actual = budget.relative ? relative : delta;
    const change = budget.relative
      ? `${relative > 0 ? "+" : relative < 0 ? "−" : "±"}${round(Math.abs(relative), 1)}%`
      : `${delta > 0 ? "+" : delta < 0 ? "−" : "±"}${format(budget.metric, Math.abs(delta))}`;
    return {
      budget: budget.source,
      status: exceeds(actual) ? "fail" : "pass",
      detail: `${budget.metric}: ${format(budget.metric, pair.original)} → ${format(budget.metric, pair.ported)} (${change})`,
    };
  });
}
