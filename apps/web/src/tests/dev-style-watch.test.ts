import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  getMissingStyleArtifactRelativePaths,
  REGISTRY_BLOCKS_DIRECTORY_RELATIVE_PATH,
  REGISTRY_LIB_DIRECTORY_RELATIVE_PATH,
  REGISTRY_UI_DIRECTORY_RELATIVE_PATH,
  shouldRebuildFromFile,
  STYLE_ARTIFACT_RELATIVE_PATHS,
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
const styleCssCompilerFile = path.resolve(
  import.meta.dir,
  "../../../../packages/create-config/src/style-css-compiler.ts",
);
const starlightThemeFile = path.resolve(
  import.meta.dir,
  "../../../../packages/starlight-theme-bejamas/src/index.ts",
);

describe("dev style watch workflow", () => {
  test("routes the app dev script through the orchestrator", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonFile, "utf8"),
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.dev).toBe("bun run scripts/dev.ts");
    expect(packageJson.scripts?.["dev:artifacts"]).toBe(
      "BEJAMAS_DEV_BUILD_ARTIFACTS=1 bun run scripts/dev.ts",
    );
    expect(packageJson.scripts?.["dev:docs"]).toBe(
      "BEJAMAS_DEV_BUILD_DOCS=1 bun run scripts/dev.ts",
    );
    expect(packageJson.scripts?.start).toBe("astro dev");
  });

  test("watches style source inputs and rebuilds compiled styles before style registry output", () => {
    expect(STYLE_SOURCE_DIRECTORY_RELATIVE_PATH).toBe(
      "packages/registry/src/styles",
    );
    expect(REGISTRY_UI_DIRECTORY_RELATIVE_PATH).toBe(
      "packages/registry/src/ui",
    );
    expect(REGISTRY_LIB_DIRECTORY_RELATIVE_PATH).toBe(
      "packages/registry/src/lib",
    );
    expect(REGISTRY_BLOCKS_DIRECTORY_RELATIVE_PATH).toBe(
      "packages/registry/src/blocks",
    );
    expect(STYLE_PIPELINE_FILE_RELATIVE_PATHS).toEqual([
      "apps/web/registry.json",
      "packages/registry/src/style-source.ts",
      "packages/create-config/src/style-css-source.ts",
      "packages/create-config/src/style-css.ts",
      "packages/create-config/src/style-css-compiler.ts",
      "packages/create-config/scripts/generate-compiled-style-css.ts",
      "packages/registry/scripts/build-web-style-registry.ts",
      "packages/ui/scripts/generate-from-style-registry.ts",
      "apps/web/scripts/normalize-paths.ts",
    ]);
    expect(STYLE_BUILD_SCRIPTS).toEqual([
      "build:compiled-styles",
      "build:style-registry",
      "generate:ui-package",
      "build:registry",
      "normalize-component-paths-in-registry",
    ]);
    expect(STYLE_IGNORED_OUTPUT_RELATIVE_PATHS).toEqual([
      "packages/create-config/src/generated",
      "apps/web/public/r",
    ]);
    expect(STYLE_ARTIFACT_RELATIVE_PATHS).toEqual([
      "packages/create-config/src/generated/compiled-style-css.js",
      "apps/web/public/r/styles/index.json",
      "apps/web/public/r/registry.json",
      "packages/ui/src/components/button/Button.astro",
    ]);
    expect(getMissingStyleArtifactRelativePaths()).toEqual([]);
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

  test("skips committed style artifacts during initial setup unless forced", () => {
    const source = fs.readFileSync(devScriptFile, "utf8");

    expect(source).toContain(
      'const BUILD_STYLE_ARTIFACTS_ON_DEV_ENV = "BEJAMAS_DEV_BUILD_ARTIFACTS";',
    );
    expect(source).toContain("function shouldBuildStyleArtifactsOnDev()");
    expect(source).toContain("async function ensureStyleArtifacts()");
    expect(source).toContain("if (shouldBuildStyleArtifactsOnDev()) {");
    expect(source).toContain("getMissingStyleArtifactRelativePaths()");
    expect(source).toContain("missingArtifacts.length > 0");
    expect(source).toContain("generated style artifacts exist");
    expect(source).toContain("await ensureStyleArtifacts();");
  });

  test("runs fast initial setup, starts the watcher, then launches astro dev", () => {
    const source = fs.readFileSync(devScriptFile, "utf8");

    expect(source).toContain(
      'const BUILD_DOCS_ON_DEV_ENV = "BEJAMAS_DEV_BUILD_DOCS";',
    );
    expect(source).toContain(
      'const GENERATED_DOCS_DIR = path.join(APP_ROOT, "src/content/docs/components");',
    );
    expect(source).toContain("function hasGeneratedComponentDocs()");
    expect(source).toContain("if (shouldBuildDocsOnDev()) {");
    expect(source).toContain("} else if (!hasGeneratedComponentDocs()) {");
    expect(source).toContain("[dev] generated component docs missing");
    expect(source).toContain('await runCommand("build:docs");');
    expect(source).toContain("[dev] generated component docs exist");
    expect(source).toContain(
      "const styleWatcher = startStyleArtifactWatcher();",
    );
    expect(source).toContain("const devServerArgs = Bun.argv.slice(2);");
    expect(source).toContain('cmd: ["bun", "run", "start", ...devServerArgs]');
  });

  test("rebuilds nested registry component, lib, and block edits without watching generated output", () => {
    const source = fs.readFileSync(watcherScriptFile, "utf8");
    const workspaceRoot = path.resolve(import.meta.dir, "../../../..");

    expect(source).toContain("function isRegistrySourcePath");
    expect(source).toContain("isRegistrySourcePath(filePath)");
    expect(source).toContain(
      "recursive: REGISTRY_SOURCE_DIRECTORIES.includes(directoryPath)",
    );

    for (const input of [
      "packages/registry/src/blocks/features-01/Features01.astro",
      "packages/registry/src/ui/button/Button.astro",
      "packages/registry/src/lib/utils.ts",
      "apps/web/registry.json",
    ]) {
      expect(shouldRebuildFromFile(path.join(workspaceRoot, input))).toBe(true);
    }

    for (const output of [
      "apps/web/public/r/features-01.json",
      "apps/web/public/r/index.json",
      "apps/web/public/r/styles/bejamas-juno/features-01.json",
      "packages/ui/src/components/button/Button.astro",
    ]) {
      expect(shouldRebuildFromFile(path.join(workspaceRoot, output))).toBe(
        false,
      );
    }
  });

  test("keeps style compiler package imports resolvable from the app dev cwd", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonFile, "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const source = fs.readFileSync(styleCssCompilerFile, "utf8");

    expect(source).toContain('@import "tw-animate-css";');
    expect({
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }).toHaveProperty("tw-animate-css");
  });

  test("keeps theme font css imports resolvable from the app dev cwd", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonFile, "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const source = fs.readFileSync(starlightThemeFile, "utf8");

    expect(source).toContain("@fontsource/inter/400.css");
    expect({
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }).toHaveProperty("@fontsource/inter");
  });
});
