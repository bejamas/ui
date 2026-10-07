import kleur from "kleur";
import { truncate } from "./format";
import {
  COMPARISON_HEADINGS,
  VISUAL_HEADINGS,
  assetRows,
  lighthouseRows,
  qualityRows,
  unmatchedSlots,
  visualRows,
  type ComparisonRow,
} from "./report";
import type { BenchReport, CheckStatus } from "./types";

const STATUS_SYMBOL: Record<CheckStatus, string> = {
  pass: kleur.green("✓"),
  fail: kleur.red("✗"),
  warn: kleur.yellow("!"),
  skip: kleur.dim("–"),
};

const INDENT = "  ";
const MAX_COMPONENT_DIFFERENCES = 5;

const visibleLength = (value: string) =>
  value.replace(/\x1b\[[0-9;]*m/g, "").length;

function wrap(text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && visibleLength(line) + 1 + visibleLength(word) > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function columns(
  headings: string[],
  rows: string[][],
  align: ("l" | "r")[] = [],
) {
  const widths = headings.map((_, index) =>
    Math.max(...[headings, ...rows].map((row) => visibleLength(row[index]!))),
  );
  const line = (row: string[]) =>
    INDENT +
    row
      .map((cell, index) => {
        const padding = " ".repeat(widths[index]! - visibleLength(cell));
        return align[index] === "r" ? padding + cell : cell + padding;
      })
      .join("  ")
      .trimEnd();
  return [kleur.dim(line(headings)), ...rows.map(line)].join("\n");
}

function comparisonColumns(label: string, rows: ComparisonRow[]) {
  return columns(
    [label, ...COMPARISON_HEADINGS],
    rows.map(({ cells, trend }) => {
      const change =
        trend === 1
          ? kleur.red(cells[3]!)
          : trend === -1
            ? kleur.green(cells[3]!)
            : cells[3]!;
      return [cells[0]!, cells[1]!, cells[2]!, change];
    }),
    ["l", "r", "r", "r"],
  );
}

/** Label/detail list where details wrap to the terminal width. */
function statusList(
  items: { status: CheckStatus; label: string; detail: string }[],
  width: number,
) {
  const labelWidth = Math.max(...items.map((item) => item.label.length));
  const detailWidth = Math.max(30, width - INDENT.length - labelWidth - 4);
  return items
    .map((item) => {
      const [first = "", ...rest] = wrap(item.detail, detailWidth);
      const lead = `${INDENT}${STATUS_SYMBOL[item.status]} ${item.label.padEnd(labelWidth)}  `;
      const hang = " ".repeat(INDENT.length + 2 + labelWidth + 2);
      return [lead + first, ...rest.map((line) => hang + line)].join("\n");
    })
    .join("\n");
}

function heading(title: string, note?: string) {
  return kleur.bold(title) + (note ? kleur.dim(` · ${note}`) : "");
}

/** Everything a reader needs from the report, formatted for a terminal. */
export function renderSummary(
  report: BenchReport,
  width = process.stdout.columns || 100,
) {
  const sections: string[] = [];
  const { original, ported } = report.targets;
  sections.push(
    `${report.passed ? kleur.green().bold("PASS") : kleur.red().bold("FAIL")}  ${original.finalUrl} ${kleur.dim("→")} ${ported.finalUrl}`,
  );

  sections.push(`${heading("Checks")}\n${statusList(report.checks, width)}`);

  if (report.budgets.length > 0) {
    sections.push(
      `${heading("Budgets")}\n${statusList(
        report.budgets.map((budget) => ({ ...budget, label: budget.budget })),
        width,
      )}`,
    );
  }

  const problems = [
    ...report.errors.map((error) => ({
      status: "fail" as const,
      label: error.stage,
      detail: error.message,
    })),
    ...report.skipped.map((skip) => ({
      status: "skip" as const,
      label: skip.stage,
      detail: skip.reason,
    })),
  ];
  if (problems.length > 0) {
    sections.push(`${heading("Stages")}\n${statusList(problems, width)}`);
  }

  if (report.lighthouse) {
    const { lighthouse } = report;
    const notes = [
      `median of ${lighthouse.runs} run${lighthouse.runs === 1 ? "" : "s"}`,
      ...(report.comparability.comparable ? [] : ["timings not comparable"]),
    ];
    sections.push(
      `${heading(`Lighthouse ${lighthouse.formFactor}`, notes.join(" · "))}\n${comparisonColumns("Metric", lighthouseRows(report))}`,
    );
  }

  if (report.assets) {
    const { viewport } = report.assets.original;
    sections.push(
      `${heading("Route assets", `cold load at ${viewport.width}×${viewport.height}`)}\n${comparisonColumns("Asset", assetRows(report))}`,
    );
  }

  if (report.visual) {
    const { visual } = report;
    const lines = [
      heading("Visual parity", `within ${visual.tolerance}px`),
      columns(VISUAL_HEADINGS, visualRows(report), [
        "l",
        "r",
        "r",
        "r",
        "r",
        "r",
      ]),
    ];
    for (const result of visual.widths) {
      if (result.differences.length > 0) {
        lines.push(
          "",
          `${INDENT}Component differences at ${result.width}px${result.differences.length > MAX_COMPONENT_DIFFERENCES ? ` (first ${MAX_COMPONENT_DIFFERENCES} of ${result.differences.length})` : ""}`,
          columns(
            ["Component", "Text", "Original", "Ported"],
            result.differences
              .slice(0, MAX_COMPONENT_DIFFERENCES)
              .map((difference) => [
                difference.slot,
                truncate(difference.text, 32),
                difference.original.join(" × "),
                difference.ported.join(" × "),
              ]),
          ),
        );
      }
    }
    // Unmatched slots explain low match counts; widths usually agree.
    const first = visual.widths[0];
    if (first && first.matchedElements < first.originalElements) {
      lines.push(
        "",
        ...wrap(
          `Only in original: ${unmatchedSlots(first.unmatchedOriginal) || "none"}`,
          width - INDENT.length,
        ).map((line) => INDENT + kleur.dim(line)),
        ...wrap(
          `Only in ported: ${unmatchedSlots(first.unmatchedPorted) || "none"}`,
          width - INDENT.length,
        ).map((line) => INDENT + kleur.dim(line)),
      );
    }
    sections.push(lines.join("\n"));
  }

  if (report.quality) {
    const { viewport } = report.quality;
    sections.push(
      `${heading("Page quality", `${viewport.width}×${viewport.height}`)}\n${columns(
        ["Measure", "Original", "Ported"],
        qualityRows(report),
        ["l", "r", "r"],
      )}`,
    );
  }

  return sections.join("\n\n");
}
