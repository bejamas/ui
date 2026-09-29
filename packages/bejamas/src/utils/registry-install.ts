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

interface RegistryInstallContext {
  cwd: string;
  config: Config | null;
  uiConfig: Config | null;
  uiDir: string;
  verbose: boolean;
  overwrite: boolean;
}

/**
 * Repairs the output of several shadcn runs in one command. Work the next run
 * depends on happens per item in `install`; project-wide passes (import scan,
 * package exports, dependency installs) run once in `finish`, which the command
 * also calls before exiting on a failure so completed items stay usable.
 */
export class RegistryInstallBatch {
  private readonly items: RegistryItem[] = [];
  private readonly written = new Set<string>();
  private readonly kept = new Set<string>();
  private readonly bases: string[];

  constructor(private readonly context: RegistryInstallContext) {
    const { cwd, config, uiConfig } = context;
    // shadcn reports paths relative to the monorepo root in a workspace.
    const workspaceRoot =
      config &&
      uiConfig &&
      uiConfig.resolvedPaths.cwd !== config.resolvedPaths.cwd
        ? findCommonRoot(config.resolvedPaths.cwd, uiConfig.resolvedPaths.cwd)
        : null;
    this.bases = workspaceRoot ? [cwd, workspaceRoot] : [cwd];
  }

  async install({
    items,
    writtenFiles,
    skippedFiles,
  }: {
    items: RegistryItem[];
    /** Files shadcn reported as created or updated. */
    writtenFiles: string[];
    /** Files shadcn left alone, for example because an overwrite was declined. */
    skippedFiles: string[];
  }) {
    const { cwd, uiDir, verbose, overwrite } = this.context;
    const reorganization = await reorganizeRegistryItems(
      items,
      uiDir,
      verbose,
      overwrite,
    );

    this.items.push(...items);
    for (const file of resolveReportedFiles(writtenFiles, this.bases)) {
      this.written.add(file);
    }
    // Never rewrite a file the user kept: neither a declined overwrite nor an
    // existing subfolder copy that reorganization left in place.
    for (const file of resolveReportedFiles(skippedFiles, this.bases)) {
      this.kept.add(file);
    }
    for (const file of reorganization.skippedFiles) {
      this.kept.add(path.resolve(uiDir, file));
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

  async finish() {
    if (!this.items.length) return;
    const { cwd, config, uiConfig, uiDir, verbose } = this.context;
    const items = this.items.splice(0);
    const written = Array.from(this.written);
    // A file written by any item in this command is ours to repair.
    const kept = Array.from(this.kept).filter(
      (file) => !this.written.has(file),
    );
    this.written.clear();
    this.kept.clear();

    await fixAstroImports(cwd, verbose, uiConfig, {
      kind: "configured-roots",
      exclude: kept,
    });

    // Shared UI roots use the UI config; app files (including block targets
    // outside aliases.components) need the app's aliases instead.
    if (config) {
      const appFiles = uiConfig
        ? filesOutsideConfigRoots(cwd, written, uiConfig)
        : written;
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
        const blockItems = items.filter(
          (item) => item.type === "registry:block",
        );
        if (blockItems.length) {
          await ensureRegistryDependencies(
            config.resolvedPaths.cwd,
            blockItems,
          );
        }
      }
    }
  }
}
