import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { version as BENCH_VERSION } from "@bejamas/bench/package.json";

// Bench ships Lighthouse and Playwright, so it runs on demand instead of
// being a dependency of the CLI. The version is pinned at build time.
export const PINNED_BENCH_VERSION: string = BENCH_VERSION;
export const PINNED_BENCH_PACKAGE = `@bejamas/bench@${PINNED_BENCH_VERSION}`;
export const PINNED_BENCH_EXEC_PREFIX = path.join(
  os.tmpdir(),
  "bejamas-bench",
  PINNED_BENCH_VERSION,
);

export async function ensurePinnedBenchExecPrefix() {
  await fs.mkdir(PINNED_BENCH_EXEC_PREFIX, { recursive: true });
  return PINNED_BENCH_EXEC_PREFIX;
}

export function buildPinnedBenchInvocation(benchArgs: string[]) {
  return {
    cmd: process.platform === "win32" ? "npm.cmd" : "npm",
    args: [
      "exec",
      "--yes",
      "--prefix",
      PINNED_BENCH_EXEC_PREFIX,
      `--package=${PINNED_BENCH_PACKAGE}`,
      "--",
      "bejamas-bench",
      ...benchArgs,
    ],
  };
}

/** Everything after the `bench` subcommand, passed through untouched. */
export function extractBenchArgs(rawArgv: string[]) {
  const commandIndex = rawArgv.indexOf("bench");
  return commandIndex === -1 ? [] : rawArgv.slice(commandIndex + 1);
}
