import { describe, expect, test } from "bun:test";
import { Command } from "commander";
import benchPackage from "../../bench/package.json";
import { bench, PINNED_BENCH } from "../src/commands/bench";

describe("bench command", () => {
  test("pins the workspace @bejamas/bench version", () => {
    expect(PINNED_BENCH.version).toBe(benchPackage.version);
  });

  test("runs bejamas-bench through an isolated npm exec", () => {
    expect(
      PINNED_BENCH.invocation(["--original", "a.test", "--ported", "b.test"]),
    ).toEqual({
      cmd: process.platform === "win32" ? "npm.cmd" : "npm",
      args: [
        "exec",
        "--yes",
        "--prefix",
        PINNED_BENCH.execPrefix,
        `--package=@bejamas/bench@${benchPackage.version}`,
        "--",
        "bejamas-bench",
        "--original",
        "a.test",
        "--ported",
        "b.test",
      ],
      source: "isolated",
    });
  });

  test("passes every argument after the subcommand through", async () => {
    let received: string[] = [];
    const program = new Command()
      .version("1.0.0", "-v, --version")
      .enablePositionalOptions()
      .addCommand(
        bench.action((args: string[]) => {
          received = args;
        }),
      );
    const args = [
      "--original",
      "localhost:3000",
      "--ported",
      "localhost:4321",
      "--help",
      "-v",
      "--fail-on",
      "lcp>10%",
    ];
    await program.parseAsync(["bench", ...args], { from: "user" });
    expect(received).toEqual(args);
  });
});
