import kleur from "kleur";
import {
  assetsSection,
  budgetItems,
  componentDifferences,
  lighthouseSection,
  qualitySection,
  stageItems,
  unmatchedSlots,
  visualSection,
  type Cell,
  type Section,
  type StatusItem,
  type Table,
} from "./sections";
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

const colorCell = (cell: Cell) =>
  typeof cell === "string"
    ? cell
    : cell.tone === "worse"
      ? kleur.red(cell.text)
      : kleur.green(cell.text);

function columns({ headings, align, rows }: Table) {
  const cells = rows.map((row) => row.map(colorCell));
  const widths = headings.map((_, index) =>
    Math.max(...[headings, ...cells].map((row) => visibleLength(row[index]!))),
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
  return [kleur.dim(line(headings)), ...cells.map(line)].join("\n");
}

/** Label/detail list where details wrap to the terminal width. */
function statusList(items: readonly StatusItem[], width: number) {
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

function heading(title: string, notes: readonly string[] = []) {
  return (
    kleur.bold(title) +
    (notes.length > 0 ? kleur.dim(` · ${notes.join(" · ")}`) : "")
  );
}

const sectionBlock = ({ title, notes, table }: Section) =>
  `${heading(title, notes)}\n${columns(table)}`;

/** Everything a reader needs from the report, formatted for a terminal. */
export function renderSummary(
  report: BenchReport,
  width = process.stdout.columns || 100,
) {
  const { original, ported } = report.targets;
  const sections = [
    `${report.passed ? kleur.green().bold("PASS") : kleur.red().bold("FAIL")}  ${original.finalUrl} ${kleur.dim("→")} ${ported.finalUrl}`,
    `${heading("Checks")}\n${statusList(report.checks, width)}`,
  ];

  const budgets = budgetItems(report);
  if (budgets.length > 0)
    sections.push(`${heading("Budgets")}\n${statusList(budgets, width)}`);
  const stages = stageItems(report);
  if (stages.length > 0)
    sections.push(`${heading("Stages")}\n${statusList(stages, width)}`);

  const { lighthouse, assets, visual, quality, comparability } = report;
  if (lighthouse)
    sections.push(sectionBlock(lighthouseSection(lighthouse, comparability)));
  if (assets) sections.push(sectionBlock(assetsSection(assets)));

  if (visual) {
    const lines = [sectionBlock(visualSection(visual))];
    for (const result of visual.widths) {
      if (result.differences.length === 0) continue;
      const shown =
        result.differences.length > MAX_COMPONENT_DIFFERENCES
          ? ` (first ${MAX_COMPONENT_DIFFERENCES} of ${result.differences.length})`
          : "";
      lines.push(
        "",
        `${INDENT}Component differences at ${result.width}px${shown}`,
        columns(
          componentDifferences(result, {
            limit: MAX_COMPONENT_DIFFERENCES,
            textLength: 32,
          }),
        ),
      );
    }
    // Unmatched slots explain low match counts; widths usually agree.
    const unmatched = visual.widths[0] ? unmatchedSlots(visual.widths[0]) : [];
    if (unmatched.length > 0) {
      lines.push(
        "",
        ...unmatched
          .flatMap((line) => wrap(line, width - INDENT.length))
          .map((line) => INDENT + kleur.dim(line)),
      );
    }
    sections.push(lines.join("\n"));
  }

  if (quality) sections.push(sectionBlock(qualitySection(quality)));

  return sections.join("\n\n");
}
