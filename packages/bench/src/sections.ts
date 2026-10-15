import { formatBytes, formatDelta, truncate } from "./format";
import { LIGHTHOUSE, formatValue } from "./metrics";
import {
  LIGHTHOUSE_METRICS,
  type AssetCategory,
  type AssetsResult,
  type BenchReport,
  type CheckStatus,
  type Comparability,
  type LighthouseResult,
  type QualityResult,
  type VisualResult,
  type VisualWidthResult,
} from "./types";

// What the Markdown report and the terminal summary show. Each renderer only
// decides how to lay it out.

/** Whether a change is an improvement or a regression for the port. */
export type Tone = "better" | "worse";
export type Cell = string | { text: string; tone: Tone };

export interface Table {
  headings: string[];
  align: ("l" | "r")[];
  rows: Cell[][];
}

export interface Section {
  title: string;
  /** Short qualifiers, such as the viewport or the number of runs. */
  notes: string[];
  table: Table;
}

export interface StatusItem {
  status: CheckStatus;
  label: string;
  detail: string;
}

export const cellText = (cell: Cell) =>
  typeof cell === "string" ? cell : cell.text;

export const textTable = (headings: string[], rows: Cell[][]): Table => ({
  headings,
  align: headings.map(() => "l"),
  rows,
});

/** A label column followed by right-aligned values. */
const valueTable = (headings: string[], rows: Cell[][]): Table => ({
  headings,
  align: headings.map((_, index) => (index === 0 ? "l" : "r")),
  rows,
});

const COMPARISON = ["Original", "Ported", "Change"];

function comparisonRow(
  label: string,
  original: number | null,
  ported: number | null,
  format: (value: number) => string,
  higherIsBetter = false,
): Cell[] {
  const delta = original === null || ported === null ? 0 : ported - original;
  const change = formatDelta(original, ported, format);
  return [
    label,
    original === null ? "–" : format(original),
    ported === null ? "–" : format(ported),
    delta === 0
      ? change
      : {
          text: change,
          tone: delta > 0 === higherIsBetter ? "better" : "worse",
        },
  ];
}

export function budgetItems(report: BenchReport): StatusItem[] {
  return report.budgets.map(({ budget, status, detail }) => ({
    status,
    label: budget,
    detail,
  }));
}

/** Stages that failed or were skipped. */
export function stageItems(report: BenchReport): StatusItem[] {
  return [
    ...report.errors.map(({ stage, message }) => ({
      status: "fail" as const,
      label: stage,
      detail: message,
    })),
    ...report.skipped.map(({ stage, reason }) => ({
      status: "skip" as const,
      label: stage,
      detail: reason,
    })),
  ];
}

export function lighthouseSection(
  lighthouse: LighthouseResult,
  comparability: Comparability,
): Section {
  return {
    title: `Lighthouse ${lighthouse.formFactor}`,
    notes: [
      `median of ${lighthouse.runs} run${lighthouse.runs === 1 ? "" : "s"}`,
      ...(comparability.comparable ? [] : ["timings not comparable"]),
    ],
    table: valueTable(
      ["Metric", ...COMPARISON],
      LIGHTHOUSE_METRICS.map((metric) => {
        const { label, unit, higherIsBetter } = LIGHTHOUSE[metric];
        return comparisonRow(
          label,
          lighthouse.original.median[metric],
          lighthouse.ported.median[metric],
          (value) => formatValue(unit, value),
          higherIsBetter,
        );
      }),
    ),
  };
}

const ASSET_ROWS: [AssetCategory, string][] = [
  ["js", "JavaScript (gzip)"],
  ["css", "CSS (gzip)"],
  ["html", "HTML (gzip)"],
  ["fonts", "Fonts"],
  ["images", "Images"],
  ["other", "Other"],
];

export function assetsSection({ original, ported }: AssetsResult): Section {
  const { viewport } = original;
  return {
    title: "Route assets",
    notes: [`cold load at ${viewport.width}×${viewport.height}`],
    table: valueTable(
      ["Asset", ...COMPARISON],
      [
        ...ASSET_ROWS.map(([category, label]) => {
          const a = original.categories[category];
          const b = ported.categories[category];
          return comparisonRow(
            `${label}, ${a.count} → ${b.count} files`,
            a.size,
            b.size,
            formatBytes,
          );
        }),
        comparisonRow(
          "HTML + CSS + JS + fonts",
          original.coreSize,
          ported.coreSize,
          formatBytes,
        ),
        comparisonRow(
          "All requests (transferred)",
          original.transfer,
          ported.transfer,
          formatBytes,
        ),
        comparisonRow("Requests", original.requests, ported.requests, String),
      ],
    ),
  };
}

export function visualSection(visual: VisualResult): Section {
  return {
    title: "Visual parity",
    notes: [`within ${visual.tolerance}px`],
    table: valueTable(
      [
        "Width",
        "Matched components",
        "Component diffs",
        "Region diffs",
        "Pixels differing",
        "Height change",
      ],
      visual.widths.map((result) => [
        `${result.width}px`,
        `${result.matchedElements} of ${result.originalElements}`,
        String(result.differences.length),
        String(result.landmarkDifferences.length),
        `${result.pixels.mismatch}%`,
        `${result.pixels.heightDelta > 0 ? "+" : ""}${result.pixels.heightDelta}px`,
      ]),
    ),
  };
}

export function qualitySection(quality: QualityResult): Section {
  const { original, ported, viewport } = quality;
  const row = (label: string, read: (side: typeof original) => string) => [
    label,
    read(original),
    read(ported),
  ];
  return {
    title: "Page quality",
    notes: [`${viewport.width}×${viewport.height}`],
    table: valueTable(
      ["Measure", "Original", "Ported"],
      [
        row("DOM elements", (side) => String(side.domElements)),
        row("Serialized DOM", (side) => formatBytes(side.domBytes)),
        row("axe-core violations", (side) => String(side.violations.length)),
        row("Browser errors", (side) => String(side.errors.length)),
        row("Failed requests", (side) => String(side.failedRequests.length)),
      ],
    ),
  };
}

/** Matched components whose size differs, the first `limit` of them. */
export function componentDifferences(
  result: VisualWidthResult,
  { limit, textLength }: { limit: number; textLength: number },
): Table {
  return textTable(
    ["Component", "Text", "Original", "Ported"],
    result.differences
      .slice(0, limit)
      .map((difference) => [
        difference.slot,
        truncate(difference.text, textLength),
        difference.original.join(" × "),
        difference.ported.join(" × "),
      ]),
  );
}

const slotCounts = (counts: Record<string, number>) =>
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([slot, count]) => `${slot} (${count})`)
    .join(", ") || "none";

/** Slots that only one side has, which explain low match counts. */
export function unmatchedSlots(result: VisualWidthResult): string[] {
  const { unmatchedOriginal, unmatchedPorted } = result;
  if (
    Object.keys(unmatchedOriginal).length +
      Object.keys(unmatchedPorted).length ===
    0
  )
    return [];
  return [
    `Only in original: ${slotCounts(unmatchedOriginal)}`,
    `Only in ported: ${slotCounts(unmatchedPorted)}`,
  ];
}
