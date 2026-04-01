import { watch } from "node:fs";
import path from "node:path";

export const APP_ROOT = path.resolve(import.meta.dir, "..");
export const WORKSPACE_ROOT = path.resolve(APP_ROOT, "../..");
export const STYLE_SOURCE_DIRECTORY_RELATIVE_PATH =
  "packages/registry/src/styles";
export const REGISTRY_UI_DIRECTORY_RELATIVE_PATH = "packages/registry/src/ui";
export const REGISTRY_LIB_DIRECTORY_RELATIVE_PATH = "packages/registry/src/lib";
export const STYLE_PIPELINE_FILE_RELATIVE_PATHS = [
  "packages/registry/src/style-source.ts",
  "packages/create-config/src/style-css-source.ts",
  "packages/create-config/src/style-css.ts",
  "packages/create-config/src/style-css-compiler.ts",
  "packages/create-config/scripts/generate-compiled-style-css.ts",
  "packages/registry/scripts/build-web-style-registry.ts",
  "packages/ui/scripts/generate-from-style-registry.ts",
] as const;
export const STYLE_IGNORED_OUTPUT_RELATIVE_PATHS = [
  "packages/create-config/src/generated",
  "apps/web/public/r/styles",
] as const;
export const STYLE_BUILD_SCRIPTS = [
  "build:compiled-styles",
  "build:style-registry",
  "generate:ui-package",
] as const;
export const STYLE_REBUILD_DEBOUNCE_MS = 150;

type Logger = Pick<Console, "error" | "info">;

type StyleArtifactWatcherOptions = {
  cwd?: string;
  debounceMs?: number;
  logger?: Logger;
};

type StyleArtifactWatcher = {
  close: () => void;
};

const STYLE_SOURCE_DIRECTORY = resolveWorkspacePath(
  STYLE_SOURCE_DIRECTORY_RELATIVE_PATH,
);
const REGISTRY_UI_DIRECTORY = resolveWorkspacePath(
  REGISTRY_UI_DIRECTORY_RELATIVE_PATH,
);
const REGISTRY_LIB_DIRECTORY = resolveWorkspacePath(
  REGISTRY_LIB_DIRECTORY_RELATIVE_PATH,
);
const STYLE_PIPELINE_FILE_PATHS = new Set(
  STYLE_PIPELINE_FILE_RELATIVE_PATHS.map(resolveWorkspacePath),
);
const STYLE_IGNORED_OUTPUT_PATHS =
  STYLE_IGNORED_OUTPUT_RELATIVE_PATHS.map(resolveWorkspacePath);
const STYLE_WATCH_DIRECTORIES = [
  STYLE_SOURCE_DIRECTORY,
  REGISTRY_UI_DIRECTORY,
  REGISTRY_LIB_DIRECTORY,
  ...new Set(
    STYLE_PIPELINE_FILE_RELATIVE_PATHS.map((filePath) =>
      path.dirname(resolveWorkspacePath(filePath)),
    ),
  ),
];

function resolveWorkspacePath(relativePath: string) {
  return path.resolve(WORKSPACE_ROOT, relativePath);
}

function isIgnoredPath(filePath: string) {
  return STYLE_IGNORED_OUTPUT_PATHS.some(
    (ignoredPath) =>
      filePath === ignoredPath ||
      filePath.startsWith(`${ignoredPath}${path.sep}`),
  );
}

function isStyleSourcePath(filePath: string) {
  return (
    path.dirname(filePath) === STYLE_SOURCE_DIRECTORY &&
    /^style-.*\.css$/u.test(path.basename(filePath))
  );
}

function isRegistrySourcePath(filePath: string) {
  const extension = path.extname(filePath);
  const directory = path.dirname(filePath);

  if (extension !== ".astro" && extension !== ".ts") {
    return false;
  }

  return (
    directory.startsWith(`${REGISTRY_UI_DIRECTORY}${path.sep}`) ||
    directory === REGISTRY_UI_DIRECTORY ||
    directory.startsWith(`${REGISTRY_LIB_DIRECTORY}${path.sep}`) ||
    directory === REGISTRY_LIB_DIRECTORY
  );
}

function shouldRebuildFromFile(filePath: string) {
  if (isIgnoredPath(filePath)) {
    return false;
  }

  return (
    isStyleSourcePath(filePath) ||
    isRegistrySourcePath(filePath) ||
    STYLE_PIPELINE_FILE_PATHS.has(filePath)
  );
}

async function runScript(
  scriptName: (typeof STYLE_BUILD_SCRIPTS)[number],
  cwd: string,
) {
  const process = Bun.spawn({
    cmd: ["bun", "run", scriptName],
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await process.exited;

  if (exitCode !== 0) {
    throw new Error(`\`bun run ${scriptName}\` exited with code ${exitCode}`);
  }
}

export async function runStyleArtifactBuild(
  options: Pick<StyleArtifactWatcherOptions, "cwd" | "logger"> = {},
) {
  const cwd = options.cwd ?? APP_ROOT;
  const logger = options.logger ?? console;

  for (const scriptName of STYLE_BUILD_SCRIPTS) {
    logger.info(`[style-watch] running ${scriptName}`);
    await runScript(scriptName, cwd);
  }
}

export function startStyleArtifactWatcher(
  options: StyleArtifactWatcherOptions = {},
): StyleArtifactWatcher {
  const cwd = options.cwd ?? APP_ROOT;
  const debounceMs = options.debounceMs ?? STYLE_REBUILD_DEBOUNCE_MS;
  const logger = options.logger ?? console;
  const watchers = STYLE_WATCH_DIRECTORIES.map((directoryPath) =>
    watch(directoryPath, (eventType, filename) => {
      if (closed) {
        return;
      }

      if (filename == null) {
        scheduleBuild(`${eventType}:${path.basename(directoryPath)}`);
        return;
      }

      const nextPath = path.resolve(directoryPath, filename.toString());
      if (!shouldRebuildFromFile(nextPath)) {
        return;
      }

      scheduleBuild(path.relative(WORKSPACE_ROOT, nextPath));
    }),
  );

  let closed = false;
  let isBuilding = false;
  let hasPendingBuild = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let pendingReason: string | undefined;

  function scheduleBuild(reason: string) {
    pendingReason = reason;

    if (isBuilding) {
      hasPendingBuild = true;
      return;
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      void runQueuedBuild();
    }, debounceMs);
  }

  async function runQueuedBuild() {
    if (closed || isBuilding) {
      return;
    }

    isBuilding = true;

    do {
      hasPendingBuild = false;
      const reason = pendingReason;
      pendingReason = undefined;

      logger.info(
        reason
          ? `[style-watch] rebuilding style artifacts after ${reason}`
          : "[style-watch] rebuilding style artifacts",
      );

      try {
        await runStyleArtifactBuild({ cwd, logger });
        logger.info("[style-watch] style artifacts updated");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[style-watch] rebuild failed: ${message}`);
      }
    } while (!closed && hasPendingBuild);

    isBuilding = false;
  }

  return {
    close() {
      closed = true;

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      for (const currentWatcher of watchers) {
        currentWatcher.close();
      }
    },
  };
}

if (import.meta.main) {
  startStyleArtifactWatcher();
  console.info("[style-watch] watching registry source files");
}
