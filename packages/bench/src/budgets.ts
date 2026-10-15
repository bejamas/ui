import { BenchError } from "./errors";
import { LIGHTHOUSE, UNIT_FACTORS, formatValue, type Unit } from "./metrics";
import { round } from "./stats";
import type {
  AssetsResult,
  BudgetResult,
  Comparability,
  LighthouseMetric,
  LighthouseResult,
  Paired,
  SideAssets,
  VisualResult,
} from "./types";

export type BudgetMetric =
  | LighthouseMetric
  | "js"
  | "css"
  | "html"
  | "fonts"
  | "total"
  | "requests"
  | "pixels";

export interface Budget {
  source: string;
  metric: BudgetMetric;
  op: ">" | "<";
  value: number;
  /** Compare the relative change in percent instead of the absolute change. */
  relative: boolean;
}

export interface BudgetInputs {
  assets?: AssetsResult;
  lighthouse?: LighthouseResult;
  visual?: VisualResult;
  comparability: Comparability;
}

/** Why a budget could not be evaluated. */
type SkipReason = string;

/**
 * Most metrics are budgeted by their change from original to ported. Pixel
 * mismatch is already a comparison, so its budget applies to the value itself.
 */
type MetricSpec =
  | {
      kind: "change";
      unit: Unit;
      read: (inputs: BudgetInputs) => Paired<number> | SkipReason;
    }
  | {
      kind: "absolute";
      unit: Unit;
      read: (
        inputs: BudgetInputs,
      ) => { value: number; detail: string } | SkipReason;
    };

const lighthouseMetric = (metric: LighthouseMetric): MetricSpec => ({
  kind: "change",
  unit: LIGHTHOUSE[metric].unit,
  read: ({ lighthouse, comparability }) => {
    if (!lighthouse) return "the Lighthouse stage did not run";
    if (!comparability.comparable)
      return "timings are not comparable between these URLs";
    const original = lighthouse.original.median[metric];
    const ported = lighthouse.ported.median[metric];
    if (original === null || ported === null)
      return `Lighthouse did not report ${metric}`;
    return { original, ported };
  },
});

const assetMetric = (
  unit: Unit,
  read: (side: SideAssets) => number,
): MetricSpec => ({
  kind: "change",
  unit,
  read: ({ assets }) =>
    assets
      ? { original: read(assets.original), ported: read(assets.ported) }
      : "the assets stage did not run",
});

const METRICS: Record<BudgetMetric, MetricSpec> = {
  score: lighthouseMetric("score"),
  fcp: lighthouseMetric("fcp"),
  lcp: lighthouseMetric("lcp"),
  tbt: lighthouseMetric("tbt"),
  cls: lighthouseMetric("cls"),
  si: lighthouseMetric("si"),
  js: assetMetric("bytes", (side) => side.categories.js.size),
  css: assetMetric("bytes", (side) => side.categories.css.size),
  html: assetMetric("bytes", (side) => side.categories.html.size),
  fonts: assetMetric("bytes", (side) => side.categories.fonts.size),
  total: assetMetric("bytes", (side) => side.coreSize),
  requests: assetMetric("count", (side) => side.requests),
  pixels: {
    kind: "absolute",
    unit: "percent",
    read: ({ visual }) => {
      const widths = visual?.widths ?? [];
      if (widths.length === 0) return "the visual stage did not run";
      const worst = widths.reduce((a, b) =>
        b.pixels.mismatch > a.pixels.mismatch ? b : a,
      );
      return {
        value: worst.pixels.mismatch,
        detail: `${formatValue("percent", worst.pixels.mismatch)} of pixels differ at ${worst.width}px`,
      };
    },
  },
};

const isBudgetMetric = (value: string): value is BudgetMetric =>
  Object.hasOwn(METRICS, value);

export const BUDGET_HELP = `Budgets compare the ported URL with the original. Size and timing budgets
use the change (ported − original), absolute or relative with %:
  lcp>10%     fail when LCP grows by more than 10%
  js>0        fail when route JavaScript (gzip) grows at all
  total>20kb  fail when HTML + CSS + JS + fonts grow by more than 20 KiB
  score<-5    fail when the Lighthouse score drops by more than 5 points
  pixels>1%   fail when screenshots differ in more than 1% of pixels (absolute)
Metrics: ${Object.keys(METRICS).join(", ")}.`;

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
  const metric = match[1]!.toLowerCase();
  if (!isBudgetMetric(metric)) {
    throw new BenchError(
      `Unknown budget metric "${metric}" in "${source}". ${Object.keys(METRICS).join(", ")} are supported.`,
    );
  }
  const spec = METRICS[metric];
  const unit = match[4]?.toLowerCase();
  let value = Number(match[3]);
  if (unit && unit !== "%") {
    const factors = UNIT_FACTORS[spec.unit] ?? {};
    if (!Object.hasOwn(factors, unit))
      throw new BenchError(
        `Unit "${unit}" does not apply to ${metric} in "${source}".`,
      );
    value *= factors[unit]!;
  }
  return {
    source,
    metric,
    op: match[2] as ">" | "<",
    value,
    relative: unit === "%" && spec.kind === "change",
  };
}

const sign = (value: number) => (value > 0 ? "+" : value < 0 ? "−" : "±");

function evaluateBudget(budget: Budget, inputs: BudgetInputs): BudgetResult {
  const spec = METRICS[budget.metric];
  const result = (actual: number, detail: string): BudgetResult => ({
    budget: budget.source,
    status: (budget.op === ">" ? actual > budget.value : actual < budget.value)
      ? "fail"
      : "pass",
    detail,
  });
  const skip = (reason: SkipReason): BudgetResult => ({
    budget: budget.source,
    status: "skip",
    detail: reason,
  });

  if (spec.kind === "absolute") {
    const reading = spec.read(inputs);
    if (typeof reading === "string") return skip(reading);
    return result(reading.value, reading.detail);
  }

  const pair = spec.read(inputs);
  if (typeof pair === "string") return skip(pair);
  const format = (value: number) => formatValue(spec.unit, value);
  const delta = pair.ported - pair.original;
  const values = `${budget.metric}: ${format(pair.original)} → ${format(pair.ported)}`;
  if (!budget.relative) {
    return result(
      delta,
      `${values} (${sign(delta)}${format(Math.abs(delta))})`,
    );
  }
  const relative =
    pair.original === 0
      ? delta === 0
        ? 0
        : Math.sign(delta) * Infinity
      : (delta / pair.original) * 100;
  return result(
    relative,
    `${values} (${sign(relative)}${round(Math.abs(relative), 1)}%)`,
  );
}

export function evaluateBudgets(
  budgets: readonly Budget[],
  inputs: BudgetInputs,
): BudgetResult[] {
  return budgets.map((budget) => evaluateBudget(budget, inputs));
}
