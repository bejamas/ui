import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, test } from "bun:test";
import { Launcher } from "chrome-launcher";
import pkg from "../package.json";
import type { BenchReport } from "../src/types";
import { serve } from "./fixtures/page";

const cli = resolve(import.meta.dir, "../dist/cli.js");

async function run(args: string[], cwd?: string) {
  // Node, not Bun, is the runtime the published bin targets.
  const proc = Bun.spawn(["node", cli, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, exitCode };
}

describe("usage", () => {
  test("prints the version", async () => {
    const result = await run(["--version"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(pkg.version);
  });

  test("prints help with budget documentation", async () => {
    const result = await run(["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      "Usage: bejamas-bench [options] <original> <ported>",
    );
    expect(result.stdout).toContain("pixels>1%");
  });

  test("exits with 2 on usage errors before measuring", async () => {
    for (const args of [
      [],
      ["a.test", "b.test", "--fail-on", "foo>1"],
      ["a.test", "b.test", "--only", "nope"],
      ["ftp://a", "b.test"],
    ]) {
      const result = await run(args);
      expect(result.exitCode).toBe(2);
    }
  });

  test("exits with 2 when a URL cannot be reached", async () => {
    const result = await run([
      "http://127.0.0.1:9/",
      "http://127.0.0.1:9/",
      "--only",
      "quality",
    ]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Could not reach the original URL");
  });
});

const chrome = process.env.CHROME_PATH ?? Launcher.getFirstInstallation();

describe.skipIf(!chrome)("end to end", () => {
  const servers: { stop: () => void }[] = [];
  afterAll(() => servers.forEach((server) => server.stop()));
  const start = (options: Parameters<typeof serve>[0]) => {
    const server = serve(options);
    servers.push(server);
    return server.url;
  };

  test("passes equivalent pages that differ only in framework wrappers", async () => {
    const out = mkdtempSync(join(tmpdir(), "bench-e2e-"));
    const original = start({});
    const ported = start({ wrapSections: true });
    const result = await run([
      original,
      ported,
      "--out",
      out,
      "--runs",
      "1",
      "--widths",
      "412",
      "--fail-on",
      "pixels>1%,js>1kb",
    ]);
    const report: BenchReport = JSON.parse(
      readFileSync(join(out, "report.json"), "utf8"),
    );
    expect(report.errors).toEqual([]);
    expect(report.checks.filter((check) => check.status === "fail")).toEqual(
      [],
    );
    expect(report.passed).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(report.assets!.ported.categories.js.count).toBe(1);
    expect(report.visual!.widths[0]!.matchedElements).toBe(4);
    expect(report.lighthouse!.original.runs).toHaveLength(1);
    expect(report.lighthouse!.ported.median.score).toBeGreaterThan(0);
    expect(readdirSync(join(out, "screenshots")).sort()).toEqual([
      "diff-412.png",
      "original-412.png",
      "ported-412.png",
    ]);
    expect(readFileSync(join(out, "report.md"), "utf8")).toContain(
      "## Result: PASS",
    );
  }, 120_000);

  test("fails a port with layout, text and accessibility regressions", async () => {
    const cwd = mkdtempSync(join(tmpdir(), "bench-e2e-"));
    const original = start({});
    const ported = start({
      buttonPadding: 24,
      missingAlt: true,
      extraText: " Now with more.",
    });
    const result = await run(
      [original, ported, "--skip", "lighthouse", "--widths", "412", "--json"],
      cwd,
    );
    const report: BenchReport = JSON.parse(result.stdout);
    const status = Object.fromEntries(
      report.checks.map((check) => [check.id, check.status]),
    );
    expect(result.exitCode).toBe(1);
    expect(status).toMatchObject({
      text: "fail",
      accessibility: "fail",
      "geometry-412": "fail",
    });
    expect(report.visual!.widths[0]!.differences[0]).toMatchObject({
      slot: "button",
      original: [expect.any(Number), expect.any(Number)],
    });
    expect(report.lighthouse).toBeUndefined();

    const reportOnly = await run(
      [original, ported, "--only", "quality", "--report-only"],
      cwd,
    );
    expect(reportOnly.exitCode).toBe(0);
    expect(reportOnly.stdout).toContain("FAIL");
    expect(reportOnly.stdout).toContain("Visible text");
    expect(reportOnly.stdout).toContain("Page quality");
    // Report files are opt-in.
    expect(readdirSync(cwd)).toEqual([]);
  }, 120_000);
});
