import { relative } from "node:path";
import { formatBytes, formatDelta, formatMs, truncate } from "./format";
import { round } from "./stats";
import type {
  AssetCategory,
  BenchReport,
  CheckStatus,
  LighthouseMetric,
} from "./types";

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: "✓ pass",
  fail: "✗ fail",
  warn: "! warn",
  skip: "– skip",
};

function escapeCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function table(
  headings: string[],
  rows: string[][],
  align: ("l" | "r")[] = [],
) {
  const cells = [headings, ...rows].map((row) => row.map(escapeCell));
  const widths = headings.map((_, index) =>
    Math.max(3, ...cells.map((row) => row[index]!.length)),
  );
  const pad = (value: string, index: number) =>
    align[index] === "r"
      ? value.padStart(widths[index]!)
      : value.padEnd(widths[index]!);
  const line = (row: string[]) => `| ${row.map(pad).join(" | ")} |`;
  const divider = `| ${widths.map((width, index) => (align[index] === "r" ? `${"-".repeat(width - 1)}:` : "-".repeat(width))).join(" | ")} |`;
  return [line(cells[0]!), divider, ...cells.slice(1).map(line)].join("\n");
}

/** A table row plus whether the ported value is better (-1) or worse (1). */
export interface ComparisonRow {
  cells: string[];
  trend: -1 | 0 | 1;
}

export const COMPARISON_HEADINGS = ["Original", "Ported", "Change"];

function comparisonRow(
  label: string,
  original: number | null,
  ported: number | null,
  format: (value: number) => string,
  higherIsBetter = false,
): ComparisonRow {
  const delta = original === null || ported === null ? 0 : ported - original;
  return {
    cells: [
      label,
      original === null ? "–" : format(original),
      ported === null ? "–" : format(ported),
      formatDelta(original, ported, format),
    ],
    trend: delta === 0 ? 0 : delta > 0 !== higherIsBetter ? 1 : -1,
  };
}

const LIGHTHOUSE_ROWS: [LighthouseMetric, string, (value: number) => string][] =
  [
    ["score", "Performance score", (value) => String(round(value, 0))],
    ["fcp", "First Contentful Paint", formatMs],
    ["lcp", "Largest Contentful Paint", formatMs],
    ["tbt", "Total Blocking Time", formatMs],
    ["cls", "Cumulative Layout Shift", (value) => String(round(value, 3))],
    ["si", "Speed Index", formatMs],
  ];

export function lighthouseRows(report: BenchReport): ComparisonRow[] {
  const lighthouse = report.lighthouse!;
  return LIGHTHOUSE_ROWS.map(([metric, label, format]) =>
    comparisonRow(
      label,
      lighthouse.original.median[metric],
      lighthouse.ported.median[metric],
      format,
      metric === "score",
    ),
  );
}

const ASSET_ROWS: [AssetCategory, string][] = [
  ["js", "JavaScript (gzip)"],
  ["css", "CSS (gzip)"],
  ["html", "HTML (gzip)"],
  ["fonts", "Fonts"],
  ["images", "Images"],
  ["other", "Other"],
];

export function assetRows(report: BenchReport): ComparisonRow[] {
  const { original, ported } = report.assets!;
  const value = (side: typeof original, category: AssetCategory) =>
    side.categories[category].gzip ?? side.categories[category].transfer;
  return [
    ...ASSET_ROWS.map(([category, label]) =>
      comparisonRow(
        `${label}, ${original.categories[category].count} → ${ported.categories[category].count} files`,
        value(original, category),
        value(ported, category),
        formatBytes,
      ),
    ),
    comparisonRow(
      "HTML + CSS + JS + fonts",
      original.coreGzip,
      ported.coreGzip,
      formatBytes,
    ),
    comparisonRow(
      "All requests (transferred)",
      original.transfer,
      ported.transfer,
      formatBytes,
    ),
    comparisonRow("Requests", original.requests, ported.requests, String),
  ];
}

export const VISUAL_HEADINGS = [
  "Width",
  "Matched components",
  "Component diffs",
  "Region diffs",
  "Pixels differing",
  "Height change",
];

export function visualRows(report: BenchReport) {
  return report.visual!.widths.map((result) => [
    `${result.width}px`,
    `${result.matchedElements} of ${result.originalElements}`,
    String(result.differences.length),
    String(result.landmarkDifferences.length),
    `${result.pixels.mismatch}%`,
    `${result.pixels.heightDelta > 0 ? "+" : ""}${result.pixels.heightDelta}px`,
  ]);
}

export function qualityRows(report: BenchReport) {
  const { original, ported } = report.quality!;
  return [
    ["DOM elements", String(original.domElements), String(ported.domElements)],
    [
      "Serialized DOM",
      formatBytes(original.domBytes),
      formatBytes(ported.domBytes),
    ],
    [
      "axe-core violations",
      String(original.violations.length),
      String(ported.violations.length),
    ],
    [
      "Browser errors",
      String(original.errors.length),
      String(ported.errors.length),
    ],
    [
      "Failed requests",
      String(original.failedRequests.length),
      String(ported.failedRequests.length),
    ],
  ];
}

/** Slots that only one side has, most frequent first. */
export function unmatchedSlots(counts: Record<string, number>) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([slot, count]) => `${slot} (${count})`)
    .join(", ");
}

function checksTable(report: BenchReport) {
  return table(
    ["Check", "Status", "Detail"],
    report.checks.map((check) => [
      check.label,
      STATUS_LABEL[check.status],
      check.detail,
    ]),
  );
}

export function renderMarkdown(report: BenchReport, outDir: string) {
  const link = (label: string, file: string | null) =>
    file
      ? `[${label}](${relative(outDir, file).split("\\").join("/")})`
      : label;
  const lines: string[] = [];
  // Blank lines keep headings, paragraphs and tables separate blocks.
  const push = (...values: string[]) =>
    lines.push(...values.flatMap((value) => [value, ""]));

  push(
    "# UI bench report",
    [
      `- **Original:** ${report.targets.original.finalUrl}`,
      `- **Ported:** ${report.targets.ported.finalUrl}`,
      `- **Measured:** ${report.measuredAt} with ${report.environment.browser ?? "Chrome"}, Node ${report.environment.node}`,
    ].join("\n"),
  );
  if (report.warnings.length > 0)
    push(
      report.warnings
        .map((warning) => `> **Warning:** ${warning}`)
        .join("\n>\n"),
    );

  push(`## Result: ${report.passed ? "PASS" : "FAIL"}`, checksTable(report));
  if (report.budgets.length > 0) {
    push(
      "### Budgets",
      table(
        ["Budget", "Status", "Detail"],
        report.budgets.map((budget) => [
          `\`${budget.budget}\``,
          STATUS_LABEL[budget.status],
          budget.detail,
        ]),
      ),
    );
  }
  if (report.errors.length > 0) {
    push(
      "### Stage errors",
      report.errors
        .map((error) => `- **${error.stage}:** ${error.message}`)
        .join("\n"),
    );
  }
  if (report.skipped.length > 0) {
    push(
      "### Skipped stages",
      report.skipped
        .map((skip) => `- **${skip.stage}:** ${skip.reason}`)
        .join("\n"),
    );
  }

  if (report.lighthouse) {
    const { lighthouse } = report;
    push(
      `## Lighthouse ${lighthouse.formFactor}`,
      `Median of ${lighthouse.runs} Lighthouse ${lighthouse.version} runs per URL with simulated throttling, run in ${lighthouse.order} order. These are lab results, not field data.${report.comparability.comparable ? "" : " **Timings are not comparable:** " + report.comparability.reasons.join(" ")}`,
      table(
        ["Metric", ...COMPARISON_HEADINGS],
        lighthouseRows(report).map((row) => row.cells),
        ["l", "r", "r", "r"],
      ),
    );
  }

  if (report.assets) {
    const { viewport } = report.assets.original;
    push(
      "## Route assets",
      `Responses of a cold load at ${viewport.width}×${viewport.height}, until the network is idle. HTML, CSS and JavaScript are recompressed with gzip level 9 so servers with different compression compare equally; other assets use their transferred size.`,
      table(
        ["Asset", ...COMPARISON_HEADINGS],
        assetRows(report).map((row) => row.cells),
        ["l", "r", "r", "r"],
      ),
    );
  }

  if (report.visual) {
    const { visual } = report;
    push(
      "## Visual parity",
      `Visible \`data-slot\` components are matched by slot name, text and order, and their sizes compared within ${visual.tolerance}px. Top-level header, main, section and footer regions are compared by position and size. Screenshot pixels are compared over the area both pages cover.`,
      table(VISUAL_HEADINGS, visualRows(report), [
        "l",
        "r",
        "r",
        "r",
        "r",
        "r",
      ]),
    );
    for (const result of visual.widths) {
      const capture = (side: "original" | "ported") =>
        visual.captures.find(
          (item) => item.side === side && item.width === result.width,
        )!;
      push(
        `### ${result.width}px`,
        `Screenshots: ${link("original", capture("original").screenshot)}, ${link("ported", capture("ported").screenshot)}, ${link("diff", result.pixels.diff)}`,
      );
      if (result.differences.length > 0) {
        push(
          table(
            ["Component", "Text", "Original", "Ported"],
            result.differences
              .slice(0, 20)
              .map((difference) => [
                difference.slot,
                truncate(difference.text, 40),
                difference.original.join(" × "),
                difference.ported.join(" × "),
              ]),
          ) +
            (result.differences.length > 20
              ? `\n\n…and ${result.differences.length - 20} more in report.json.`
              : ""),
        );
      }
      if (result.landmarkDifferences.length > 0) {
        const box = (
          value: { x: number; y: number; width: number; height: number } | null,
        ) =>
          value
            ? `${value.width} × ${value.height} at ${value.x}, ${value.y}`
            : "missing";
        push(
          table(
            ["Region", "Original", "Ported"],
            result.landmarkDifferences
              .slice(0, 20)
              .map((difference) => [
                `${difference.index + 1}. ${difference.tag}`,
                box(difference.original),
                box(difference.ported),
              ]),
          ),
        );
      }

      if (
        Object.keys(result.unmatchedOriginal).length +
          Object.keys(result.unmatchedPorted).length >
        0
      ) {
        push(
          [
            `- Only in original: ${unmatchedSlots(result.unmatchedOriginal) || "none"}`,
            `- Only in ported: ${unmatchedSlots(result.unmatchedPorted) || "none"}`,
          ].join("\n"),
        );
      }
    }
  }

  if (report.quality) {
    const { original, ported, text, viewport } = report.quality;
    push(
      "## Page quality",
      `Measured at ${viewport.width}×${viewport.height}.`,
      table(["Measure", "Original", "Ported"], qualityRows(report), [
        "l",
        "r",
        "r",
      ]),
    );
    if (!text.identical) {
      push(
        "### First text difference",
        `- **Original:** ${text.original}\n- **Ported:** ${text.ported}`,
      );
    }
    for (const [label, side] of [
      ["original", original],
      ["ported", ported],
    ] as const) {
      if (side.violations.length > 0) {
        push(
          `### axe-core violations (${label})`,
          side.violations
            .map(
              (violation) =>
                `- \`${violation.id}\` (${violation.impact ?? "unknown"}, ${violation.nodes} nodes): ${violation.help}`,
            )
            .join("\n"),
        );
      }
      const problems = [...side.errors, ...side.failedRequests];
      if (problems.length > 0) {
        push(
          `### Browser errors (${label})`,
          problems.map((problem) => `- ${truncate(problem, 300)}`).join("\n"),
        );
      }
    }
  }

  return `${lines.join("\n").trim()}\n`;
}
