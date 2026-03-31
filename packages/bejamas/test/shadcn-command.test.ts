import { describe, expect, test } from "bun:test";
import {
  buildPinnedShadcnInvocation,
  PINNED_SHADCN_PACKAGE,
  PINNED_SHADCN_VERSION,
} from "../src/utils/shadcn-cli";
import { extractPassthroughArgs } from "../src/utils/shadcn-command";

describe("pinned shadcn invocation", () => {
  test("uses the bundled shadcn entrypoint when available", () => {
    const bundledEntrypoint = "/repo/node_modules/shadcn/dist/index.js";
    const invocation = buildPinnedShadcnInvocation(
      ["add", "button"],
      bundledEntrypoint,
    );

    expect(invocation).toEqual({
      cmd: process.execPath,
      args: [bundledEntrypoint, "add", "button"],
      source: "bundled",
    });
  });

  test("falls back to exact shadcn@4.1.1 when no bundled entrypoint is available", () => {
    expect(PINNED_SHADCN_VERSION).toBe("4.1.1");
    expect(buildPinnedShadcnInvocation(["info"], null)).toEqual({
      cmd: "npx",
      args: ["-y", PINNED_SHADCN_PACKAGE, "info"],
      source: "fallback",
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
