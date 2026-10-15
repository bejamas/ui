#!/usr/bin/env node
import { relative } from "node:path";
import { Command, Option } from "commander";
import kleur from "kleur";
import pkg from "../package.json" with { type: "json" };
import {
  collect,
  nonNegativeNumber,
  positiveInteger,
  resolveTargetUrls,
  selectStages,
  stageList,
  widthList,
} from "./args";
import { BUDGET_HELP } from "./budgets";
import { BenchError } from "./errors";
import { renderSummary } from "./summary";
import { runBench } from "./run";
import { STAGES, type FormFactor, type StageName } from "./types";

/** Parsed options, as the parsers and defaults below produce them. */
interface CliOptions {
  original?: string;
  ported?: string;
  out?: string;
  runs: number;
  widths: number[];
  formFactor: FormFactor;
  only?: StageName[];
  skip?: StageName[];
  tolerance: number;
  failOn: string[];
  reportOnly?: true;
  allowDev?: true;
  chromePath?: string;
  timeout: number;
  json?: true;
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
    .action(async (positional: string[], opts: CliOptions) => {
      const warn = (message: string) =>
        process.stderr.write(`${kleur.yellow("warning")} ${message}\n`);
      const { original, ported, warning } = resolveTargetUrls(opts, positional);
      if (warning) warn(warning);

      const { report, files } = await runBench(
        {
          original,
          ported,
          outDir: opts.out,
          runs: opts.runs,
          widths: opts.widths,
          formFactor: opts.formFactor,
          stages: selectStages(opts.only, opts.skip),
          tolerance: opts.tolerance,
          budgets: opts.failOn,
          allowDev: opts.allowDev ?? false,
          chromePath: opts.chromePath,
          timeout: opts.timeout,
        },
        (message) => process.stderr.write(`${kleur.dim("›")} ${message}\n`),
      );

      if (opts.json) {
        // The summary shows comparability; JSON consumers get it on stderr.
        for (const reason of report.comparability.reasons) warn(reason);
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
