import { describe, expect, test } from "bun:test";
import benchPackage from "../../bench/package.json";
import {
  buildPinnedBenchInvocation,
  extractBenchArgs,
  PINNED_BENCH_EXEC_PREFIX,
  PINNED_BENCH_VERSION,
} from "../src/utils/bench-cli";

describe("bench command", () => {
  test("pins the workspace @bejamas/bench version", () => {
    expect(PINNED_BENCH_VERSION).toBe(benchPackage.version);
  });

  test("runs bejamas-bench through an isolated npm exec", () => {
    expect(
      buildPinnedBenchInvocation([
        "--original",
        "a.test",
        "--ported",
        "b.test",
        "--runs",
        "3",
      ]),
    ).toEqual({
      cmd: process.platform === "win32" ? "npm.cmd" : "npm",
      args: [
        "exec",
        "--yes",
        "--prefix",
        PINNED_BENCH_EXEC_PREFIX,
        `--package=@bejamas/bench@${benchPackage.version}`,
        "--",
        "bejamas-bench",
        "--original",
        "a.test",
        "--ported",
        "b.test",
        "--runs",
        "3",
      ],
    });
  });

  test("passes every argument after the subcommand through", () => {
    expect(
      extractBenchArgs([
        "bench",
        "--original",
        "localhost:3000",
        "--ported",
        "localhost:4321",
        "--help",
        "--fail-on",
        "lcp>10%",
      ]),
    ).toEqual([
      "--original",
      "localhost:3000",
      "--ported",
      "localhost:4321",
      "--help",
      "--fail-on",
      "lcp>10%",
    ]);
    expect(extractBenchArgs(["add", "button"])).toEqual([]);
  });
});
