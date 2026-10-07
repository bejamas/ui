import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { renderSummary } from "../src/summary";
import type { BenchReport } from "../src/types";

const stripAnsi = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, "");

const report = JSON.parse(
  readFileSync(join(import.meta.dir, "fixtures/report.json"), "utf8"),
) as BenchReport;

test("summarizes every section of the report", () => {
  const summary = stripAnsi(renderSummary(report, 100));
  expect(summary).toStartWith(
    "FAIL  https://original.test/ → http://localhost:4321/",
  );
  for (const section of [
    "Checks",
    "Budgets",
    "Lighthouse mobile · median of 5 runs · timings not comparable",
    "Route assets · cold load at 412×823",
    "Visual parity · within 0.5px",
    "Component differences at 412px",
    "Page quality · 1280×800",
  ]) {
    expect(summary).toContain(section);
  }
  expect(summary).toContain("✗ Visible text");
  expect(summary).toContain("Only in original: badge (2)");
});

test("wraps check details to the terminal width", () => {
  const lines = stripAnsi(renderSummary(report, 72)).split("\n");
  const checks = lines.slice(
    lines.indexOf("Checks") + 1,
    lines.indexOf("Budgets") - 1,
  );
  expect(checks.length).toBeGreaterThan(report.checks.length);
  for (const line of checks) expect(line.length).toBeLessThanOrEqual(72);
});
