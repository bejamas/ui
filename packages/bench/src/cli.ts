#!/usr/bin/env node
import { relative } from "node:path";
import { Command, InvalidArgumentError, Option } from "commander";
import kleur from "kleur";
import pkg from "../package.json" with { type: "json" };
import { BUDGET_HELP, parseBudgets } from "./budgets";
import { BenchError } from "./errors";
import { renderSummary } from "./summary";
import { runBench } from "./run";
import { normalizeUrl, resolveTargetUrls } from "./targets";
import { STAGES, type FormFactor, type StageName } from "./types";

function positiveInteger(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw new InvalidArgumentError("Expected a positive integer.");
  return parsed;
}

function nonNegativeNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0)
    throw new InvalidArgumentError("Expected a non-negative number.");
  return parsed;
}

function widthList(value: string) {
  const widths = value.split(",").map((part) => Number(part.trim()));
  if (
    widths.length === 0 ||
    widths.some(
      (width) => !Number.isInteger(width) || width < 200 || width > 3840,
    )
  ) {
    throw new InvalidArgumentError(
      "Expected comma-separated widths between 200 and 3840.",
    );
  }
  return [...new Set(widths)];
}

function stageList(value: string) {
  const stages = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const unknown = stages.filter(
    (stage) => !STAGES.includes(stage as StageName),
  );
  if (stages.length === 0 || unknown.length > 0) {
    throw new InvalidArgumentError(
      `Expected a comma-separated list of: ${STAGES.join(", ")}.`,
    );
  }
  return stages as StageName[];
}

function collect(value: string, previous: string[]) {
  return [...previous, value];
}

function createProgram() {
  return new Command()
    .name("bejamas-bench")
    .description(
      "Compare an original site with its ported version: Lighthouse, route assets, accessibility, text and visual parity.",
    )
    .version(pkg.version, "-v, --version", "output the version number")
    .usage("--original <url> --ported <url> [options]")
    .option(
      "--original <url>",
      "URL of the original site, e.g. https://example.com",
    )
    .option(
      "--ported <url>",
      "URL of the ported site, e.g. http://localhost:4321",
    )
    .argument(
      "[urls...]",
      "positional <original> <ported>; prefer the named flags so the URLs cannot be swapped",
    )
    .option(
      "-o, --out <dir>",
      "also write report.md, report.json, screenshots and Lighthouse reports to this directory",
    )
    .option(
      "-r, --runs <count>",
      "Lighthouse runs per URL; medians are reported",
      positiveInteger,
      5,
    )
    .addOption(
      new Option("-w, --widths <list>", "viewport widths for visual parity")
        .argParser(widthList)
        .default([412, 1280], "412,1280"),
    )
    .addOption(
      new Option("--form-factor <type>", "Lighthouse device emulation")
        .choices(["mobile", "desktop"])
        .default("mobile"),
    )
    .option(
      "--only <stages>",
      `run only these stages (${STAGES.join(", ")})`,
      stageList,
    )
    .option("--skip <stages>", "skip these stages", stageList)
    .option(
      "--tolerance <px>",
      "allowed size difference for matched components and regions",
      nonNegativeNumber,
      0.5,
    )
    .addOption(
      new Option(
        "--fail-on <budgets>",
        "fail when the ported URL exceeds these budgets, e.g. lcp>10%,js>0 (repeatable)",
      )
        .argParser(collect)
        .default([], "none"),
    )
    .option("--report-only", "always exit with 0 unless the run itself fails")
    .option(
      "--allow-dev",
      "measure assets and Lighthouse even when a dev server is detected",
    )
    .option(
      "--chrome-path <path>",
      "Chrome executable (defaults to CHROME_PATH or an installed Chrome)",
    )
    .option("--timeout <ms>", "navigation timeout", positiveInteger, 60_000)
    .option("--json", "print the JSON report to stdout instead of the summary")
    .addHelpText(
      "after",
      `
Exit codes: 0 when all checks and budgets pass, 1 when any fail, 2 when the run cannot complete.

${BUDGET_HELP}

Examples:
  $ bejamas-bench --original http://localhost:3000 --ported http://localhost:4321
  $ bejamas-bench --original http://localhost:3000 --ported http://localhost:4321 --out bench-report
  $ bejamas-bench --original https://example.com --ported https://new.example.com --fail-on "lcp>10%,js>0,pixels>1%"
  $ bejamas-bench --original localhost:3000 --ported localhost:4321 --only visual,quality --widths 375,768,1440`,
    )
    .action(async (positional: string[], opts) => {
      const { original, ported, warning } = resolveTargetUrls(opts, positional);
      for (const url of [original, ported]) normalizeUrl(url);
      if (warning)
        process.stderr.write(`${kleur.yellow("warning")} ${warning}\n`);
      parseBudgets(opts.failOn);
      const skip = new Set<StageName>(opts.skip ?? []);
      const stages = (
        (opts.only as StageName[] | undefined) ?? [...STAGES]
      ).filter((stage) => !skip.has(stage));
      if (stages.length === 0) throw new BenchError("No stages left to run.");

      const log = (message: string) =>
        process.stderr.write(`${kleur.dim("›")} ${message}\n`);
      const { report, files } = await runBench(
        {
          original,
          ported,
          outDir: opts.out,
          runs: opts.runs,
          widths: opts.widths,
          formFactor: opts.formFactor as FormFactor,
          stages,
          tolerance: opts.tolerance,
          budgets: opts.failOn,
          allowDev: Boolean(opts.allowDev),
          chromePath: opts.chromePath,
          timeout: opts.timeout,
        },
        log,
      );

      if (opts.json) {
        // The summary carries warnings; JSON consumers get them on stderr.
        for (const warning of report.warnings)
          process.stderr.write(`${kleur.yellow("warning")} ${warning}\n`);
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      } else {
        process.stdout.write(`\n${renderSummary(report)}\n`);
      }
      if (files) {
        const shown = relative(process.cwd(), files.markdown);
        process.stderr.write(
          `\nReport written to ${shown.startsWith("..") ? files.markdown : shown}\n`,
        );
      }
      if (!report.passed && !opts.reportOnly) process.exitCode = 1;
      if (report.errors.length > 0) process.exitCode = 2;
    });
}

async function main(argv = process.argv) {
  const program = createProgram();
  program.exitOverride((error) => {
    // Commander errors (usage) exit with 2; help and version exit with 0.
    process.exit(error.exitCode === 0 ? 0 : 2);
  });
  try {
    await program.parseAsync(argv);
  } catch (error) {
    const message =
      error instanceof BenchError
        ? error.message
        : error instanceof Error
          ? (error.stack ?? error.message)
          : String(error);
    process.stderr.write(`${kleur.red("error")} ${message}\n`);
    process.exitCode = 2;
  }
}

await main();
