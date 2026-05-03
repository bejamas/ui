import { describe, expect, test } from "bun:test";
import {
  buildPinnedShadcnInvocation,
  PINNED_SHADCN_EXEC_PREFIX,
  PINNED_SHADCN_VERSION,
} from "../src/utils/shadcn-cli";
import { extractPassthroughArgs } from "../src/utils/shadcn-command";

describe("pinned shadcn invocation", () => {
  test("uses an isolated exact shadcn@4.6.0 npm exec invocation", () => {
    expect(PINNED_SHADCN_VERSION).toBe("4.6.0");
    expect(buildPinnedShadcnInvocation(["info"])).toEqual({
      cmd: process.platform === "win32" ? "npm.cmd" : "npm",
      args: [
        "exec",
        "--yes",
        "--prefix",
        PINNED_SHADCN_EXEC_PREFIX,
        "--package=shadcn@4.6.0",
        "--",
        "shadcn",
        "info",
      ],
      source: "isolated",
    });
  });
});

describe("shadcn command runner", () => {
  test("extracts passthrough args after -- for wrapped subcommands", () => {
    expect(
      extractPassthroughArgs(["docs", "button", "--", "--json"], "docs"),
    ).toEqual(["--json"]);

    expect(extractPassthroughArgs(["info", "--", "--json"], "info")).toEqual([
      "--json",
    ]);

    expect(extractPassthroughArgs(["docs", "button"], "docs")).toEqual([]);
  });
});
