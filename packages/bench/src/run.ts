import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PNG } from "pngjs";
import pkg from "../package.json" with { type: "json" };
import { launchBrowser, resolveChromePath } from "./browser";
import { evaluateBudgets, parseBudgets } from "./budgets";
import { comparabilityCheck, qualityChecks, visualChecks } from "./checks";
import { renderMarkdown } from "./report";
import { measureAssets } from "./stages/assets";
import { runLighthouse } from "./stages/lighthouse";
import {
  QUALITY_VIEWPORT,
  compareText,
  measureQuality,
} from "./stages/quality";
import { captureVisual, compareGeometry, comparePixels } from "./stages/visual";
import { assessComparability, inspectTarget } from "./targets";
import type {
  BenchOptions,
  BenchReport,
  Capture,
  Side,
  StageName,
  Target,
} from "./types";

export interface RunResult {
  report: BenchReport;
  /** Report files, when `outDir` is set. */
  files?: { json: string; markdown: string };
}

export async function runBench(
  options: BenchOptions,
  log: (message: string) => void = () => {},
): Promise<RunResult> {
  // Validate budgets before spending minutes on measurements.
  const budgets = parseBudgets(options.budgets);
  const outDir = options.outDir ? resolve(options.outDir) : undefined;
  if (outDir) mkdirSync(outDir, { recursive: true });

  const chromePath = resolveChromePath(options.chromePath);
  const browser = await launchBrowser(chromePath);
  let targets: [Target, Target];
  try {
    log("Checking both URLs");
    targets = await Promise.all([
      inspectTarget(browser, "original", options.original, options.timeout),
      inspectTarget(browser, "ported", options.ported, options.timeout),
    ]);
  } catch (error) {
    await browser.close();
    throw error;
  }
  const [original, ported] = targets;
  const urls: Record<Side, string> = {
    original: original.finalUrl,
    ported: ported.finalUrl,
  };
  const comparability = assessComparability(original, ported);

  const report: BenchReport = {
    schemaVersion: 1,
    tool: { name: pkg.name, version: pkg.version },
    measuredAt: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      browser: `Chrome ${browser.version()}`,
    },
    options: {
      outDir,
      runs: options.runs,
      widths: options.widths,
      formFactor: options.formFactor,
      stages: options.stages,
      tolerance: options.tolerance,
      budgets: options.budgets,
      allowDev: options.allowDev,
      chromePath: options.chromePath,
      timeout: options.timeout,
    },
    targets: { original, ported },
    comparability,
    warnings: [...comparability.reasons],
    skipped: [],
    errors: [],
    checks: [comparabilityCheck(comparability)],
    budgets: [],
    passed: false,
  };

  const stages = new Set(options.stages);
  const devServer = original.devServer ?? ported.devServer;
  if (devServer && !options.allowDev) {
    for (const stage of ["assets", "lighthouse"] as const) {
      if (!stages.delete(stage)) continue;
      report.skipped.push({
        stage,
        reason: `A development server (${devServer}) was detected. Measure production builds, or pass --allow-dev to measure anyway.`,
      });
    }
  }

  async function stage(name: StageName, run: () => Promise<void>) {
    if (!stages.has(name)) return;
    try {
      await run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      report.errors.push({ stage: name, message });
      log(`${name} failed: ${message}`);
    }
  }

  try {
    await stage("assets", async () => {
      log("Measuring route assets");
      report.assets = {
        original: await measureAssets(browser, urls.original, options.timeout),
        ported: await measureAssets(browser, urls.ported, options.timeout),
      };
    });

    await stage("quality", async () => {
      log("Checking text, headings, accessibility and browser errors");
      const originalQuality = await measureQuality(
        browser,
        urls.original,
        options.timeout,
      );
      const portedQuality = await measureQuality(
        browser,
        urls.ported,
        options.timeout,
      );
      report.quality = {
        viewport: QUALITY_VIEWPORT,
        original: originalQuality,
        ported: portedQuality,
        text: compareText(originalQuality.text, portedQuality.text),
      };
      report.checks.push(...qualityChecks(report.quality));
    });

    await stage("visual", async () => {
      const screenshotDir = outDir && join(outDir, "screenshots");
      if (screenshotDir) mkdirSync(screenshotDir, { recursive: true });
      const captures: Capture[] = [];
      const widths = [];
      for (const width of options.widths) {
        log(`Capturing layout at ${width}px`);
        const [a, b] = [
          await captureVisual(browser, {
            side: "original",
            url: urls.original,
            width,
            timeout: options.timeout,
          }),
          await captureVisual(browser, {
            side: "ported",
            url: urls.ported,
            width,
            timeout: options.timeout,
          }),
        ];
        const { comparison, diff } = comparePixels(a.image, b.image);
        if (screenshotDir) {
          for (const { capture, image } of [a, b]) {
            capture.screenshot = join(
              screenshotDir,
              `${capture.side}-${width}.png`,
            );
            writeFileSync(capture.screenshot, image);
          }
          comparison.diff = join(screenshotDir, `diff-${width}.png`);
          writeFileSync(comparison.diff, PNG.sync.write(diff));
        }
        captures.push(a.capture, b.capture);
        widths.push({
          width,
          ...compareGeometry(a.capture, b.capture, options.tolerance),
          pixels: comparison,
        });
      }
      report.visual = { tolerance: options.tolerance, captures, widths };
      report.checks.push(...visualChecks(report.visual));
    });
  } finally {
    await browser.close();
  }

  // Lighthouse runs last and alone so other browser work cannot skew timings.
  await stage("lighthouse", async () => {
    report.lighthouse = await runLighthouse({
      urls,
      runs: options.runs,
      formFactor: options.formFactor,
      chromePath,
      reportDir: outDir && join(outDir, "lighthouse"),
      onProgress: log,
    });
  });

  report.budgets = evaluateBudgets(budgets, {
    assets: report.assets,
    lighthouse: report.lighthouse,
    visual: report.visual,
    comparability,
  });
  report.passed =
    report.errors.length === 0 &&
    report.checks.every((check) => check.status !== "fail") &&
    report.budgets.every((budget) => budget.status !== "fail");

  if (!outDir) return { report };
  const files = {
    json: join(outDir, "report.json"),
    markdown: join(outDir, "report.md"),
  };
  writeFileSync(files.json, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(files.markdown, renderMarkdown(report, outDir));
  return { report, files };
}
