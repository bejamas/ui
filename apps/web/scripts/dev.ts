import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  APP_ROOT,
  getMissingStyleArtifactRelativePaths,
  runStyleArtifactBuild,
  startStyleArtifactWatcher,
} from "./watch-style-artifacts";

const BUILD_STYLE_ARTIFACTS_ON_DEV_ENV = "BEJAMAS_DEV_BUILD_ARTIFACTS";
const BUILD_DOCS_ON_DEV_ENV = "BEJAMAS_DEV_BUILD_DOCS";
const GENERATED_DOCS_DIR = path.join(APP_ROOT, "src/content/docs/components");

async function runCommand(scriptName: string) {
  const process = Bun.spawn({
    cmd: ["bun", "run", scriptName],
    cwd: APP_ROOT,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await process.exited;

  if (exitCode !== 0) {
    throw new Error(`\`bun run ${scriptName}\` exited with code ${exitCode}`);
  }
}

function shouldBuildDocsOnDev() {
  const value = Bun.env[BUILD_DOCS_ON_DEV_ENV]?.toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function shouldBuildStyleArtifactsOnDev() {
  const value = Bun.env[BUILD_STYLE_ARTIFACTS_ON_DEV_ENV]?.toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function hasGeneratedComponentDocs() {
  if (!existsSync(GENERATED_DOCS_DIR)) {
    return false;
  }

  return readdirSync(GENERATED_DOCS_DIR).some((filename) =>
    filename.endsWith(".mdx"),
  );
}

async function ensureStyleArtifacts() {
  if (shouldBuildStyleArtifactsOnDev()) {
    console.info("[dev] refreshing generated style artifacts before startup");
    await runStyleArtifactBuild();
    return;
  }

  const missingArtifacts = getMissingStyleArtifactRelativePaths();
  if (missingArtifacts.length > 0) {
    console.info(
      `[dev] generated style artifacts missing (${missingArtifacts.join(", ")}); running style build`,
    );
    await runStyleArtifactBuild();
    return;
  }

  console.info(
    "[dev] generated style artifacts exist; run `bun run dev:artifacts` to refresh them before startup",
  );
}

async function main() {
  await ensureStyleArtifacts();

  if (shouldBuildDocsOnDev()) {
    console.info("[dev] refreshing generated docs before startup");
    await runCommand("build:docs");
  } else if (!hasGeneratedComponentDocs()) {
    console.info("[dev] generated component docs missing; running docs build");
    await runCommand("build:docs");
  } else {
    console.info(
      "[dev] generated component docs exist; run `bun run dev:docs` to refresh them before startup",
    );
  }

  const styleWatcher = startStyleArtifactWatcher();
  const devServerArgs = Bun.argv.slice(2);
  const astroProcess = Bun.spawn({
    cmd: ["bun", "run", "start", ...devServerArgs],
    cwd: APP_ROOT,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  let isShuttingDown = false;

  const shutdown = () => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    styleWatcher.close();
    astroProcess.kill();
  };

  process.on("SIGINT", () => {
    shutdown();
  });
  process.on("SIGTERM", () => {
    shutdown();
  });

  const exitCode = await astroProcess.exited;
  styleWatcher.close();
  process.exit(exitCode);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[dev] startup failed: ${message}`);
  process.exit(1);
});
