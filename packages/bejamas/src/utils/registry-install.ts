import { existsSync } from "node:fs";
import path from "node:path";
import {
  syncAstroManagedFontCss,
  syncManagedTailwindCss,
} from "./apply-design-system";
import {
  fixAstroImports,
  getConfiguredSourceRoots,
  isPathWithin,
} from "./astro-imports";
import {
  cleanupAstroFontPackages,
  mergeManagedAstroFonts,
  readManagedAstroFontsFromProject,
  syncAstroFontsInProject,
  toManagedAstroFont,
} from "./astro-fonts";
import { type Config, findCommonRoot } from "./get-config";
import {
  getSubfolderFromPaths,
  reorganizeRegistryItems,
  repairUiPackageExports,
  type RegistryItem,
} from "./reorganize-components";
import { ensureRegistryDependencies } from "./registry-dependencies";

/**
 * shadcn reports written files relative to the directory it ran in, except in
 * a workspace where paths are relative to the monorepo root. Resolve each
 * reported path against the candidate bases and keep the ones that exist.
 */
export function resolveReportedFiles(
  files: Iterable<string>,
  bases: readonly string[],
  exists: (filePath: string) => boolean = existsSync,
) {
  const resolved = new Set<string>();
  for (const file of files) {
    const candidates = path.isAbsolute(file)
      ? [file]
      : bases.map((base) => path.resolve(base, file));
    const match = candidates.find((candidate) => exists(candidate));
    if (match) resolved.add(match);
  }
  return Array.from(resolved);
}

/** Installed files (relative to cwd or absolute) not covered by config aliases. */
export function filesOutsideConfigRoots(
  cwd: string,
  files: readonly string[],
  config: Config,
) {
  const roots = getConfiguredSourceRoots(config);
  return files.filter(
    (file) =>
      !roots.some((root) => isPathWithin(path.resolve(cwd, file), root)),
  );
}

export interface SubfolderMapResult {
  uniqueMap: Map<string, string>;
  sharedFilenames: Set<string>;
}

export function buildSubfolderMap(
  registryItems: RegistryItem[],
): SubfolderMapResult {
  const filenameToSubfolders = new Map<string, string[]>();

  for (const registryItem of registryItems) {
    const subfolder = getSubfolderFromPaths(registryItem.files);
    if (!subfolder) continue;

    for (const file of registryItem.files ?? []) {
      if (file.type === "registry:ui") {
        const filename = path.basename(file.path);
        const subfolders = filenameToSubfolders.get(filename) || [];
        subfolders.push(subfolder);
        filenameToSubfolders.set(filename, subfolders);
      }
    }
  }

  const uniqueMap = new Map<string, string>();
  const sharedFilenames = new Set<string>();

  filenameToSubfolders.forEach((subfolders, filename) => {
    if (subfolders.length === 1) {
      uniqueMap.set(filename, `${subfolders[0]}/${filename}`);
    } else {
      sharedFilenames.add(filename);
    }
  });

  return { uniqueMap, sharedFilenames };
}

/** Complete one installation before allowing the command to start another. */
export async function completeRegistryInstall({
  cwd,
  config,
  uiConfig,
  uiDir,
  items,
  reportedFiles,
  verbose,
  overwrite,
}: {
  cwd: string;
  config: Config | null;
  uiConfig: Config | null;
  uiDir: string;
  items: RegistryItem[];
  reportedFiles: string[];
  verbose: boolean;
  overwrite: boolean;
}) {
  const reorganization = await reorganizeRegistryItems(
    items,
    uiDir,
    verbose,
    overwrite,
  );
  await fixAstroImports(cwd, verbose, uiConfig);

  // Shared UI roots use the UI config; app files (including block targets
  // outside aliases.components) need the app's aliases instead.
  if (config) {
    const workspaceRoot =
      uiConfig && uiConfig.resolvedPaths.cwd !== config.resolvedPaths.cwd
        ? findCommonRoot(config.resolvedPaths.cwd, uiConfig.resolvedPaths.cwd)
        : null;
    const files = resolveReportedFiles(
      reportedFiles,
      workspaceRoot ? [cwd, workspaceRoot] : [cwd],
    );
    const appFiles = uiConfig
      ? filesOutsideConfigRoots(cwd, files, uiConfig)
      : files;
    if (appFiles.length) {
      await fixAstroImports(cwd, verbose, config, {
        kind: "files",
        paths: appFiles,
      });
    }
  }

  if (uiConfig) {
    await repairUiPackageExports(uiDir, uiConfig.resolvedPaths.cwd);
    if (!config || config.resolvedPaths.cwd === uiConfig.resolvedPaths.cwd) {
      await ensureRegistryDependencies(uiConfig.resolvedPaths.cwd, items);
    } else {
      await ensureRegistryDependencies(
        uiConfig.resolvedPaths.cwd,
        items.filter((item) => item.type !== "registry:block"),
      );
      const blockItems = items.filter((item) => item.type === "registry:block");
      if (blockItems.length) {
        await ensureRegistryDependencies(config.resolvedPaths.cwd, blockItems);
      }
    }
  }

  await syncManagedTailwindCss(cwd);
  // Registry trees are dependency-first, with the requested item last.
  const requestedItem = items.at(-1);
  if (requestedItem?.type === "registry:font") {
    const nextFont = toManagedAstroFont(requestedItem.name);
    if (nextFont) {
      const currentFonts = await readManagedAstroFontsFromProject(cwd);
      const nextFonts = mergeManagedAstroFonts(currentFonts, nextFont);
      await syncAstroFontsInProject(cwd, nextFonts, nextFont.cssVariable);
      await syncAstroManagedFontCss(cwd, nextFont.cssVariable);
      await cleanupAstroFontPackages(cwd);
    }
  }
  return reorganization;
}
