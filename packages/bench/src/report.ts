import { relative } from "node:path";
import { truncate } from "./format";
import {
  assetsSection,
  budgetItems,
  cellText,
  componentDifferences,
  lighthouseSection,
  qualitySection,
  stageItems,
  textTable,
  unmatchedSlots,
  visualSection,
  type StatusItem,
  type Table,
} from "./sections";
import type { BenchReport, Box, CheckStatus } from "./types";

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: "✓ pass",
  fail: "✗ fail",
  warn: "! warn",
  skip: "– skip",
};

const MAX_DIFFERENCES = 20;

function escapeCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function markdownTable({ headings, align, rows }: Table) {
  const cells = [headings, ...rows].map((row) =>
    row.map((cell) => escapeCell(cellText(cell))),
  );
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

function statusTable(heading: string, items: readonly StatusItem[]) {
  return markdownTable(
    textTable(
      [heading, "Status", "Detail"],
      items.map((item) => [item.label, STATUS_LABEL[item.status], item.detail]),
    ),
  );
}

const box = (value: Box | null) =>
  value
    ? `${value.width} × ${value.height} at ${value.x}, ${value.y}`
    : "missing";

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

  push(
    `## Result: ${report.passed ? "PASS" : "FAIL"}`,
    statusTable("Check", report.checks),
  );
  const budgets = budgetItems(report);
  if (budgets.length > 0) push("### Budgets", statusTable("Budget", budgets));
  const stages = stageItems(report);
  if (stages.length > 0) push("### Stages", statusTable("Stage", stages));

  const { lighthouse, assets, visual, quality, comparability } = report;
  if (lighthouse) {
    const section = lighthouseSection(lighthouse, comparability);
    push(
      `## ${section.title}`,
      `Median of ${lighthouse.runs} Lighthouse ${lighthouse.version} runs per URL with simulated throttling, run in ${lighthouse.order} order. These are lab results, not field data.${comparability.comparable ? "" : " **Timings are not comparable:** " + comparability.reasons.join(" ")}`,
      markdownTable(section.table),
    );
  }

  if (assets) {
    const section = assetsSection(assets);
    const { viewport } = assets.original;
    push(
      `## ${section.title}`,
      `Responses of a cold load at ${viewport.width}×${viewport.height}, until the network is idle. HTML, CSS and JavaScript are recompressed with gzip level 9 so servers with different compression compare equally; other assets use their transferred size.`,
      markdownTable(section.table),
    );
  }

  if (visual) {
    const section = visualSection(visual);
    push(
      `## ${section.title}`,
      `Visible \`data-slot\` components are matched by slot name, text and order, and their sizes compared within ${visual.tolerance}px. Top-level header, main, section and footer regions are compared by position and size. Screenshot pixels are compared over the area both pages cover.`,
      markdownTable(section.table),
    );
    for (const result of visual.widths) {
      const screenshot = (side: "original" | "ported") =>
        visual.captures.find(
          (item) => item.side === side && item.width === result.width,
        )?.screenshot ?? null;
      push(
        `### ${result.width}px`,
        `Screenshots: ${link("original", screenshot("original"))}, ${link("ported", screenshot("ported"))}, ${link("diff", result.pixels.diff)}`,
      );
      if (result.differences.length > 0) {
        const more = result.differences.length - MAX_DIFFERENCES;
        push(
          markdownTable(
            componentDifferences(result, {
              limit: MAX_DIFFERENCES,
              textLength: 40,
            }),
          ) + (more > 0 ? `\n\n…and ${more} more in report.json.` : ""),
        );
      }
      if (result.landmarkDifferences.length > 0) {
        push(
          markdownTable(
            textTable(
              ["Region", "Original", "Ported"],
              result.landmarkDifferences
                .slice(0, MAX_DIFFERENCES)
                .map((difference) => [
                  `${difference.index + 1}. ${difference.tag}`,
                  box(difference.original),
                  box(difference.ported),
                ]),
            ),
          ),
        );
      }
      const unmatched = unmatchedSlots(result);
      if (unmatched.length > 0)
        push(unmatched.map((line) => `- ${line}`).join("\n"));
    }
  }

  if (quality) {
    const section = qualitySection(quality);
    push(
      `## ${section.title}`,
      `Measured at ${section.notes.join(", ")}.`,
      markdownTable(section.table),
    );
    const { text } = quality;
    if (!text.identical) {
      push(
        "### First text difference",
        `- **Original:** ${text.original}\n- **Ported:** ${text.ported}`,
      );
    }
    for (const label of ["original", "ported"] as const) {
      const side = quality[label];
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
