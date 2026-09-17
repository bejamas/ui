import { describe, expect, test } from "bun:test";
import path from "node:path";
import { Command } from "commander";
import {
  ensureTrailingNewline,
  extractOptionsForShadcn,
  filesOutsideConfigRoots,
  formatSkippedFilesHeading,
  hasInspectionFlags,
  isAddableRegistryItem,
  isBlockRegistryItem,
  isFilePhaseSummary,
  isOverwritePrompt,
  isUiRegistryItem,
  parseShadcnOutput,
  resolveReportedFiles,
  toShadcnAddArgument,
  withoutExpandedAllOption,
  withoutShadcnSilentOption,
} from "../src/commands/add";
import type { Config } from "../src/utils/get-config";

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

describe("block-aware add helpers", () => {
  test("offers UI components and blocks by name, but expands --all to UI only", () => {
    const index = [
      { name: "button", type: "registry:ui" },
      { name: "features-01", type: "registry:block" },
      { name: "font-inter", type: "registry:font" },
      { name: "legacy" },
    ];

    expect(
      index.filter(isAddableRegistryItem).map((item) => item.name),
    ).toEqual(["button", "features-01", "legacy"]);
    expect(index.filter(isUiRegistryItem).map((item) => item.name)).toEqual([
      "button",
      "legacy",
    ]);
    expect(index.filter(isBlockRegistryItem).map((item) => item.name)).toEqual([
      "features-01",
    ]);
    expect(isBlockRegistryItem(null)).toBe(false);
  });

  test("passes the built-in @bejamas namespace to shadcn as the default registry item", () => {
    expect(toShadcnAddArgument("@bejamas/features-01")).toBe("features-01");
    expect(toShadcnAddArgument("@bejamas/button")).toBe("button");
    expect(toShadcnAddArgument("features-01")).toBe("features-01");
    expect(toShadcnAddArgument("@acme/hero")).toBe("@acme/hero");
    expect(toShadcnAddArgument("https://other.example.test/item.json")).toBe(
      "https://other.example.test/item.json",
    );
    expect(toShadcnAddArgument("@bejamas/Not Valid")).toBe(
      "@bejamas/Not Valid",
    );
  });

  test("recognizes shadcn overwrite questions and the end of its file phase", () => {
    expect(
      isOverwritePrompt(
        "\u001b[36m?\u001b[39m \u001b[1mThe file Button.astro already exists. Would you like to overwrite?\u001b[22m \u001b[90m›\u001b[39m \u001b[90m(y/N)\u001b[39m",
      ),
    ).toBe(true);
    expect(isOverwritePrompt("  - src/ui/button/Button.astro")).toBe(false);

    expect(
      isFilePhaseSummary(
        Buffer.from("\u001b[32m✔\u001b[39m Created 2 files:\n"),
      ),
    ).toBe(true);
    expect(
      isFilePhaseSummary("ℹ Skipped 18 files: (files might be identical)"),
    ).toBe(true);
    expect(isFilePhaseSummary("ℹ No files updated.")).toBe(true);
    expect(isFilePhaseSummary("- Updating files.")).toBe(false);
    expect(isFilePhaseSummary("- Checking registry.")).toBe(false);
  });

  test("does not re-forward --all after expanding the registry index", () => {
    expect(withoutExpandedAllOption(["--all", "--overwrite", "-a"])).toEqual([
      "--overwrite",
    ]);
  });

  test("keeps shadcn file output available for silent installs", () => {
    expect(
      withoutShadcnSilentOption(["--silent", "--overwrite", "-s"]),
    ).toEqual(["--overwrite"]);
  });

  test("parses created, updated, and skipped paths across stdout and stderr", () => {
    const stdout = [
      "\u001b[32mCreated 2 files:\u001b[0m",
      "  - src/components/blocks/features-01/Features01.astro",
      "  - src/components/blocks/features-01/index.ts",
      "Updated 1 file:",
      "  - src/ui/button/Button.astro",
    ].join("\n");
    const stderr = ["Skipped 1 file:", "  - src/lib/utils.ts"].join("\n");

    expect(parseShadcnOutput(stdout, stderr)).toEqual({
      created: [
        "src/components/blocks/features-01/Features01.astro",
        "src/components/blocks/features-01/index.ts",
      ],
      updated: ["src/ui/button/Button.astro"],
      skipped: ["src/lib/utils.ts"],
    });
  });

  test("resolves shadcn file reports against the app and workspace roots", () => {
    const existing = new Set([
      "/repo/apps/web/src/components/blocks/features-01/Features01.astro",
      "/repo/packages/ui/src/components/button/Button.astro",
      "/repo/apps/web/src/lib/utils.ts",
    ]);

    expect(
      resolveReportedFiles(
        [
          // Standalone projects: relative to the current directory.
          "src/lib/utils.ts",
          // Workspaces: relative to the monorepo root.
          "apps/web/src/components/blocks/features-01/Features01.astro",
          "packages/ui/src/components/button/Button.astro",
          "/repo/apps/web/src/lib/utils.ts",
          "src/components/missing.astro",
        ],
        ["/repo/apps/web", "/repo"],
        (filePath) => existing.has(filePath),
      ),
    ).toEqual([
      "/repo/apps/web/src/lib/utils.ts",
      "/repo/apps/web/src/components/blocks/features-01/Features01.astro",
      "/repo/packages/ui/src/components/button/Button.astro",
    ]);
  });

  test("finds installed files that live outside the UI config aliases", () => {
    const cwd = "/repo/apps/web";
    const uiConfig = {
      resolvedPaths: {
        cwd: "/repo/packages/ui",
        components: "/repo/packages/ui/src/components",
        ui: "/repo/packages/ui/src/components",
        lib: "/repo/packages/ui/src/lib",
        hooks: "/repo/packages/ui/src/hooks",
      },
    } as unknown as Config;

    expect(
      filesOutsideConfigRoots(
        cwd,
        [
          "src/components/blocks/features-01/Features01.astro",
          "../../packages/ui/src/components/button/Button.astro",
          path.join("/repo/packages/ui/src/components", "card/Card.astro"),
          "/repo/packages/ui/src/lib/utils.ts",
        ],
        uiConfig,
      ),
    ).toEqual(["src/components/blocks/features-01/Features01.astro"]);
  });
});

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
    expect(diffForwarded).toEqual(["--diff", "src/ui/button/Button.astro"]);
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
    expect(viewForwarded).toEqual(["--view", "src/ui/button/Button.astro"]);
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
