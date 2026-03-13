import { describe, expect, test } from "bun:test";
import path from "node:path";
import {
  extractPassthroughArgs,
  getLocalShadcnBinaryPath,
  resolveShadcnInvocation,
} from "../src/utils/shadcn-command";

describe("shadcn command runner", () => {
  test("prefers a local shadcn binary when available", () => {
    const cwd = "/repo/app";
    const localBinaryPath = getLocalShadcnBinaryPath(cwd, "linux");

    const invocation = resolveShadcnInvocation({
      cwd,
      runner: "bunx",
      hasLocalBinary: true,
      localBinaryPath,
    });

    expect(invocation).toEqual({
      command: localBinaryPath,
      argsPrefix: [],
    });
  });

  test("falls back to the detected package runner", () => {
    expect(
      resolveShadcnInvocation({
        cwd: "/repo/app",
        runner: "bunx",
        hasLocalBinary: false,
      }),
    ).toEqual({
      command: "bunx",
      argsPrefix: ["shadcn@latest"],
    });

    expect(
      resolveShadcnInvocation({
        cwd: "/repo/app",
        runner: "pnpm dlx",
        hasLocalBinary: false,
      }),
    ).toEqual({
      command: "pnpm",
      argsPrefix: ["dlx", "shadcn@latest"],
    });

    expect(
      resolveShadcnInvocation({
        cwd: "/repo/app",
        runner: "npx",
        hasLocalBinary: false,
      }),
    ).toEqual({
      command: "npx",
      argsPrefix: ["-y", "shadcn@latest"],
    });
  });

  test("extracts passthrough args after -- for wrapped subcommands", () => {
    expect(extractPassthroughArgs(["docs", "button", "--", "--json"], "docs")).toEqual([
      "--json",
    ]);

    expect(extractPassthroughArgs(["info", "--", "--json"], "info")).toEqual([
      "--json",
    ]);

    expect(extractPassthroughArgs(["docs", "button"], "docs")).toEqual([]);
  });

  test("uses platform-specific local binary names", () => {
    expect(getLocalShadcnBinaryPath("/repo/app", "linux")).toBe(
      path.resolve("/repo/app", "node_modules", ".bin", "shadcn"),
    );
    expect(getLocalShadcnBinaryPath("/repo/app", "win32")).toBe(
      path.resolve("/repo/app", "node_modules", ".bin", "shadcn.cmd"),
    );
  });
});
