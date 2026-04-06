import { describe, expect, test } from "bun:test";
import { Command } from "commander";
import {
  ensureTrailingNewline,
  extractOptionsForShadcn,
  formatSkippedFilesHeading,
  hasInspectionFlags,
} from "../src/commands/add";

function createAddLikeCommand() {
  return new Command()
    .allowUnknownOption(true)
    .exitOverride()
    .argument("[components...]")
    .option("-y, --yes", "skip confirmation prompt.", false)
    .option("-o, --overwrite", "overwrite existing files.", false)
    .option(
      "-c, --cwd <cwd>",
      "the working directory. defaults to the current directory.",
      process.cwd(),
    )
    .option("-a, --all", "add all available components", false)
    .option("-p, --path <path>", "the path to add the component to.")
    .option("-s, --silent", "mute output.", false)
    .option("--dry-run", "preview changes without writing files.", false)
    .option("--diff [path]", "show diff for a file.")
    .option("--view [path]", "show file contents.")
    .option(
      "--src-dir",
      "use the src directory when creating a new project.",
      false,
    )
    .option(
      "--no-src-dir",
      "do not use the src directory when creating a new project.",
    );
}

describe("add output helpers", () => {
  test("forwards --overwrite to shadcn when explicitly provided", () => {
    const cmd = createAddLikeCommand();
    cmd.parse(["node", "bejamas", "add", "button", "--overwrite"]);

    const forwarded = extractOptionsForShadcn(
      ["add", "button", "--overwrite"],
      cmd,
    );

    expect(forwarded).toContain("--overwrite");
  });

  test("forwards direct inspection flags to shadcn", () => {
    const cmd = createAddLikeCommand();
    cmd.parse(["node", "bejamas", "add", "button", "--dry-run"]);

    const dryRunForwarded = extractOptionsForShadcn(
      ["add", "button", "--dry-run"],
      cmd,
    );
    expect(dryRunForwarded).toContain("--dry-run");
    expect(hasInspectionFlags(dryRunForwarded)).toBe(true);
  });

  test("forwards diff and view path arguments to shadcn", () => {
    const diffCmd = createAddLikeCommand();
    diffCmd.parse([
      "node",
      "bejamas",
      "add",
      "button",
      "--diff",
      "src/ui/button/Button.astro",
    ]);
    const diffForwarded = extractOptionsForShadcn(
      ["add", "button", "--diff", "src/ui/button/Button.astro"],
      diffCmd,
    );
    expect(diffForwarded).toEqual([
      "--diff",
      "src/ui/button/Button.astro",
    ]);
    expect(hasInspectionFlags(diffForwarded)).toBe(true);

    const viewCmd = createAddLikeCommand();
    viewCmd.parse([
      "node",
      "bejamas",
      "add",
      "button",
      "--view",
      "src/ui/button/Button.astro",
    ]);
    const viewForwarded = extractOptionsForShadcn(
      ["add", "button", "--view", "src/ui/button/Button.astro"],
      viewCmd,
    );
    expect(viewForwarded).toEqual([
      "--view",
      "src/ui/button/Button.astro",
    ]);
    expect(hasInspectionFlags(viewForwarded)).toBe(true);
  });

  test("detects inspection flags from passthrough arguments too", () => {
    const cmd = createAddLikeCommand();
    cmd.parse(["node", "bejamas", "add", "button", "--", "--dry-run"]);

    const forwarded = extractOptionsForShadcn(
      ["add", "button", "--", "--dry-run"],
      cmd,
    );

    expect(forwarded).toEqual(["--", "--dry-run"]);
    expect(hasInspectionFlags(forwarded)).toBe(true);
  });

  test("uses identical-files messaging when overwrite is already enabled", () => {
    expect(formatSkippedFilesHeading(2, true)).toBe(
      "Skipped 2 files: (files might be identical)",
    );
  });

  test("keeps overwrite guidance when overwrite was not requested", () => {
    expect(formatSkippedFilesHeading(1, false)).toBe(
      "Skipped 1 file: (files might be identical, use --overwrite to overwrite)",
    );
  });

  test("normalizes captured shadcn output before replaying failures", () => {
    expect(ensureTrailingNewline("Something went wrong")).toBe(
      "Something went wrong\n",
    );
    expect(ensureTrailingNewline("Already has newline\n")).toBe(
      "Already has newline\n",
    );
  });
});
