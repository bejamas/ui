import { formatBytes, formatMs } from "./format";
import { round } from "./stats";
import type { LighthouseMetric } from "./types";

export type Unit = "ms" | "bytes" | "count" | "score" | "cls" | "percent";

const FORMATTERS: Record<Unit, (value: number) => string> = {
  ms: formatMs,
  bytes: formatBytes,
  count: String,
  score: (value) => String(round(value, 1)),
  cls: (value) => String(round(value, 3)),
  percent: (value) => `${round(value, 3)}%`,
};

export function formatValue(unit: Unit, value: number) {
  return FORMATTERS[unit](value);
}

/** Suffixes a budget value may use, by unit. */
export const UNIT_FACTORS: Partial<Record<Unit, Record<string, number>>> = {
  ms: { ms: 1, s: 1000 },
  bytes: { b: 1, kb: 1024, kib: 1024, mb: 1024 ** 2, mib: 1024 ** 2 },
};

export interface LighthouseMetricSpec {
  label: string;
  unit: Unit;
  /** Decimal places kept in the report. */
  digits: number;
  higherIsBetter: boolean;
}

export const LIGHTHOUSE: Record<LighthouseMetric, LighthouseMetricSpec> = {
  score: {
    label: "Performance score",
    unit: "score",
    digits: 2,
    higherIsBetter: true,
  },
  fcp: {
    label: "First Contentful Paint",
    unit: "ms",
    digits: 2,
    higherIsBetter: false,
  },
  lcp: {
    label: "Largest Contentful Paint",
    unit: "ms",
    digits: 2,
    higherIsBetter: false,
  },
  tbt: {
    label: "Total Blocking Time",
    unit: "ms",
    digits: 2,
    higherIsBetter: false,
  },
  cls: {
    label: "Cumulative Layout Shift",
    unit: "cls",
    digits: 4,
    higherIsBetter: false,
  },
  si: { label: "Speed Index", unit: "ms", digits: 2, higherIsBetter: false },
};
