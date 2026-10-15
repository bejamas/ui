import pkg from "../package.json" with { type: "json" };
import { createArtifacts } from "./artifacts";
import { launchBrowser, resolveChromePath } from "./browser";
import { evaluateBudgets, parseBudgets } from "./budgets";
import { reportChecks } from "./checks";
import { renderMarkdown } from "./report";
import { measureAssets } from "./stages/assets";
import { runLighthouse } from "./stages/lighthouse";
import { measureQuality } from "./stages/quality";
import { measureVisual } from "./stages/visual";
import { assessComparability, inspectTarget, normalizeUrl } from "./targets";
import type {
  BenchOptions,
  BenchReport,
  Paired,
  Side,
  SkippedStage,
  StageError,
  StageName,
  Target,
} from "./types";

export interface RunResult {
  report: BenchReport;
  /** Report files, when `outDir` is set. */
  files?: { json: string; markdown: string };
}

/** Stages that measure performance, which development servers distort. */
const PRODUCTION_ONLY: readonly StageName[] = ["assets", "lighthouse"];

export async function runBench(
  options: BenchOptions,
  log: (message: string) => void = () => {},
): Promise<RunResult> {
  // Reject bad input before spending minutes on measurements.
  const budgets = parseBudgets(options.budgets);
  const inputs: Paired<URL> = {
    original: normalizeUrl(options.original),
    ported: normalizeUrl(options.ported),
  };
  const chromePath = resolveChromePath(options.chromePath);
  const artifacts = createArtifacts(options.outDir);
  const measuredAt = new Date().toISOString();

  const browser = await launchBrowser(chromePath);
  const browserVersion = browser.version();
  const inspect = (side: Side) =>
    inspectTarget(browser, {
      side,
      input: options[side],
      url: inputs[side],
      timeout: options.timeout,
    });
  let targets: Paired<Target>;
  try {
    log("Checking both URLs");
    // Settle both so the error is always the original's first when both fail.
    const [original, ported] = await Promise.allSettled([
      inspect("original"),
      inspect("ported"),
    ]);
    if (original.status === "rejected") throw original.reason;
    if (ported.status === "rejected") throw ported.reason;
    targets = { original: original.value, ported: ported.value };
  } catch (error) {
    await browser.close();
    throw error;
  }
  const urls: Paired<string> = {
    original: targets.original.finalUrl,
    ported: targets.ported.finalUrl,
  };
  const comparability = assessComparability(targets.original, targets.ported);

  const devServer = targets.original.devServer ?? targets.ported.devServer;
  const blocked = devServer && !options.allowDev ? PRODUCTION_ONLY : [];
  const stages = options.stages.filter((stage) => !blocked.includes(stage));
  const skipped: SkippedStage[] = options.stages
    .filter((stage) => blocked.includes(stage))
    .map((stage) => ({
      stage,
      reason: `A development server (${devServer}) was detected. Measure production builds, or pass --allow-dev to measure anyway.`,
    }));

  const errors: StageError[] = [];
  async function stage<T>(name: StageName, run: () => Promise<T>) {
    if (!stages.includes(name)) return undefined;
    try {
      return await run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ stage: name, message });
      log(`${name} failed: ${message}`);
      return undefined;
    }
  }

  const { timeout } = options;
  let measured: Pick<BenchReport, "assets" | "quality" | "visual">;
  try {
    measured = {
      assets: await stage("assets", () => {
        log("Measuring route assets");
        return measureAssets(browser, urls, timeout);
      }),
      quality: await stage("quality", () => {
        log("Checking text, headings, accessibility and browser errors");
        return measureQuality(browser, urls, timeout);
      }),
      visual: await stage("visual", () =>
        measureVisual(browser, {
          urls,
          widths: options.widths,
          tolerance: options.tolerance,
          timeout,
          artifacts,
          onProgress: log,
        }),
      ),
    };
  } finally {
    await browser.close();
  }

  // Lighthouse runs last and alone so other browser work cannot skew timings.
  const lighthouse = await stage("lighthouse", () =>
    runLighthouse({
      urls,
      runs: options.runs,
      formFactor: options.formFactor,
      chromePath,
      artifacts,
      onProgress: log,
    }),
  );

  const results = { ...measured, lighthouse };
  const checks = reportChecks({ comparability, ...results });
  const budgetResults = evaluateBudgets(budgets, { comparability, ...results });
  const { original: _original, ported: _ported, ...rest } = options;
  const report: BenchReport = {
    schemaVersion: 1,
    tool: { name: pkg.name, version: pkg.version },
    measuredAt,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      browser: `Chrome ${browserVersion}`,
    },
    options: { ...rest, outDir: artifacts?.dir },
    targets,
    comparability,
    skipped,
    errors,
    ...results,
    checks,
    budgets: budgetResults,
    passed:
      errors.length === 0 &&
      checks.every((check) => check.status !== "fail") &&
      budgetResults.every((budget) => budget.status !== "fail"),
  };

  if (!artifacts) return { report };
  return {
    report,
    files: {
      json: artifacts.write(
        "report.json",
        `${JSON.stringify(report, null, 2)}\n`,
      ),
      markdown: artifacts.write(
        "report.md",
        renderMarkdown(report, artifacts.dir),
      ),
    },
  };
}
