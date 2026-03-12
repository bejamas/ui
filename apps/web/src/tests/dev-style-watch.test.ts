import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  STYLE_BUILD_SCRIPTS,
  STYLE_IGNORED_OUTPUT_RELATIVE_PATHS,
  STYLE_PIPELINE_FILE_RELATIVE_PATHS,
  STYLE_REBUILD_DEBOUNCE_MS,
  STYLE_SOURCE_DIRECTORY_RELATIVE_PATH,
} from "../../scripts/watch-style-artifacts";

const packageJsonFile = path.resolve(import.meta.dir, "../../package.json");
const devScriptFile = path.resolve(import.meta.dir, "../../scripts/dev.ts");
const watcherScriptFile = path.resolve(
  import.meta.dir,
  "../../scripts/watch-style-artifacts.ts",
);

describe("dev style watch workflow", () => {
  test("routes the app dev script through the orchestrator", () => {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.dev).toBe("bun run scripts/dev.ts");
    expect(packageJson.scripts?.start).toBe("astro dev");
  });

  test("watches style source inputs and rebuilds compiled styles before style registry output", () => {
    expect(STYLE_SOURCE_DIRECTORY_RELATIVE_PATH).toBe(
      "packages/registry/src/styles",
    );
    expect(STYLE_PIPELINE_FILE_RELATIVE_PATHS).toEqual([
      "packages/registry/src/style-source.ts",
      "packages/create-config/src/style-css-source.ts",
      "packages/create-config/src/style-css.ts",
      "packages/create-config/src/style-css-compiler.ts",
      "packages/create-config/scripts/generate-compiled-style-css.ts",
      "packages/registry/scripts/build-web-style-registry.ts",
    ]);
    expect(STYLE_BUILD_SCRIPTS).toEqual([
      "build:compiled-styles",
      "build:style-registry",
    ]);
    expect(STYLE_IGNORED_OUTPUT_RELATIVE_PATHS).toEqual([
      "packages/create-config/src/generated",
      "apps/web/public/r/styles",
    ]);
    expect(STYLE_REBUILD_DEBOUNCE_MS).toBeGreaterThan(0);
  });

  test("debounces and serializes rebuilds instead of spawning overlapping generators", () => {
    const source = fs.readFileSync(watcherScriptFile, "utf8");

    expect(source).toContain("let isBuilding = false;");
    expect(source).toContain("let hasPendingBuild = false;");
    expect(source).toContain("let debounceTimer");
    expect(source).toContain("clearTimeout(debounceTimer)");
    expect(source).toContain("if (isBuilding) {");
    expect(source).toContain("hasPendingBuild = true;");
    expect(source).toContain("await runStyleArtifactBuild({ cwd, logger });");
  });

  test("runs initial setup, starts the watcher, then launches astro dev", () => {
    const source = fs.readFileSync(devScriptFile, "utf8");

    expect(source).toContain("await runStyleArtifactBuild();");
    expect(source).toContain('await runCommand("build:docs");');
    expect(source).toContain("const styleWatcher = startStyleArtifactWatcher();");
    expect(source).toContain('cmd: ["bun", "run", "start"]');
  });
});
