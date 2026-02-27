import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "@/src/utils/logger";

export interface RegistryFile {
  path: string;
  content: string;
  type: string;
  target?: string;
}

export interface RegistryItem {
  name: string;
  type: string;
  files: RegistryFile[];
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
}

/** Maps filename to subfolder/filename for path rewriting */
export type PathRewriteMap = Map<string, string>;

/**
 * Fetches a registry item JSON from the registry URL.
 */
export async function fetchRegistryItem(
  componentName: string,
  registryUrl: string,
): Promise<RegistryItem | null> {
  // Handle style-prefixed URLs (e.g., styles/new-york-v4/avatar.json)
  const url = `${registryUrl}/styles/new-york-v4/${componentName}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Try without styles prefix as fallback
      const fallbackUrl = `${registryUrl}/${componentName}.json`;
      const fallbackResponse = await fetch(fallbackUrl);
      if (!fallbackResponse.ok) {
        return null;
      }
      return (await fallbackResponse.json()) as RegistryItem;
    }
    return (await response.json()) as RegistryItem;
  } catch {
    return null;
  }
}

/**
 * Extracts the subfolder name from registry file paths.
 * E.g., "components/ui/avatar/Avatar.astro" → "avatar"
 */
export function getSubfolderFromPaths(files: RegistryFile[]): string | null {
  // Only consider registry:ui files
  const uiFiles = files.filter((f) => f.type === "registry:ui");
  if (uiFiles.length < 2) {
    // Single file components don't need subfolders
    return null;
  }

  const subfolders = new Set<string>();

  for (const file of uiFiles) {
    const parts = file.path.split("/");
    // Look for pattern: .../ui/<subfolder>/<filename>
    const uiIndex = parts.indexOf("ui");
    if (uiIndex !== -1 && parts.length > uiIndex + 2) {
      // There's at least one folder after "ui" before the filename
      subfolders.add(parts[uiIndex + 1]);
    }
  }

  // If all files share the same subfolder, use it
  if (subfolders.size === 1) {
    return Array.from(subfolders)[0];
  }

  // Fallback: use the component name from the first file's parent directory
  if (uiFiles.length > 0) {
    const firstPath = uiFiles[0].path;
    const dirname = path.dirname(firstPath);
    const folderName = path.basename(dirname);
    // Only use if it's not "ui" itself
    if (folderName && folderName !== "ui") {
      return folderName;
    }
  }

  return null;
}

/**
 * Checks if a path exists.
 */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Builds a map of path rewrites for components that will be reorganized.
 * Call this BEFORE shadcn runs to know how to rewrite output paths.
 */
export async function buildPathRewriteMap(
  components: string[],
  uiDir: string,
  registryUrl: string,
): Promise<PathRewriteMap> {
  const rewrites: PathRewriteMap = new Map();

  if (!uiDir || components.length === 0) {
    return rewrites;
  }

  for (const componentName of components) {
    try {
      const registryItem = await fetchRegistryItem(componentName, registryUrl);
      if (!registryItem) continue;

      const subfolder = getSubfolderFromPaths(registryItem.files);
      if (!subfolder) continue;

      // Get the UI files that will be reorganized
      const uiFiles = registryItem.files.filter(
        (f) => f.type === "registry:ui",
      );

      for (const file of uiFiles) {
        const filename = path.basename(file.path);
        // Map: "Avatar.astro" → "avatar/Avatar.astro"
        rewrites.set(filename, `${subfolder}/${filename}`);
      }
    } catch {
      // Ignore errors, just skip this component
    }
  }

  return rewrites;
}

/**
 * Rewrites file paths in shadcn output to reflect reorganized structure.
 * Replaces flat paths like "/ui/Avatar.astro" with "/ui/avatar/Avatar.astro"
 */
export function rewriteOutputPaths(
  output: string,
  rewrites: PathRewriteMap,
): string {
  let result = output;

  for (const [filename, newPath] of rewrites) {
    // Match paths ending with the filename (handles various path formats)
    // e.g., "packages/ui/src/components/Avatar.astro" → "packages/ui/src/components/avatar/Avatar.astro"
    const escapedFilename = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(/[^/\\s]+)/${escapedFilename}(?=\\s|$|\\n)`, "g");
    result = result.replace(pattern, `$1/${newPath}`);
  }

  return result;
}

export interface ReorganizeResult {
  totalMoved: number;
  movedFiles: string[]; // e.g., ["avatar/Avatar.astro", "avatar/index.ts"]
  skippedFiles: string[]; // Files that already existed in subfolder (flat duplicate removed)
}

/**
 * Reorganizes multi-file components into correct subfolders.
 * Only moves files from FLAT location to subfolder.
 * Does NOT touch files already in subfolders.
 * E.g., moves `uiDir/Avatar.astro` to `uiDir/avatar/Avatar.astro`.
 * Returns info about moved files for display purposes.
 */
export async function reorganizeComponents(
  components: string[],
  uiDir: string,
  registryUrl: string,
  verbose: boolean,
): Promise<ReorganizeResult> {
  const result: ReorganizeResult = { totalMoved: 0, movedFiles: [], skippedFiles: [] };

  if (!uiDir || components.length === 0) {
    return result;
  }

  for (const componentName of components) {
    try {
      const registryItem = await fetchRegistryItem(componentName, registryUrl);
      if (!registryItem) {
        if (verbose) {
          logger.info(
            `[bejamas-ui] Could not fetch registry for ${componentName}, skipping reorganization`,
          );
        }
        continue;
      }

      const subfolder = getSubfolderFromPaths(registryItem.files);
      if (!subfolder) {
        // Single-file component or no subfolder detected, skip
        if (verbose) {
          logger.info(
            `[bejamas-ui] ${componentName} is single-file or has no subfolder, skipping`,
          );
        }
        continue;
      }

      // Get the UI files that need to be moved
      const uiFiles = registryItem.files.filter(
        (f) => f.type === "registry:ui",
      );

      const targetDir = path.join(uiDir, subfolder);
      let movedCount = 0;

      for (const file of uiFiles) {
        const filename = path.basename(file.path);
        // Only look for files in FLAT location (directly in uiDir)
        const flatPath = path.join(uiDir, filename);
        const targetPath = path.join(targetDir, filename);

        // Check if file exists in flat location
        if (!(await pathExists(flatPath))) {
          // Not in flat location, skip (may already be in subfolder)
          continue;
        }

        // Check if target already exists (don't overwrite, but clean up flat duplicate)
        if (await pathExists(targetPath)) {
          // Target exists in subfolder - delete the flat duplicate shadcn just created
          try {
            await fs.unlink(flatPath);
            result.skippedFiles.push(`${subfolder}/${filename}`);
            if (verbose) {
              logger.info(
                `[bejamas-ui] Removed flat duplicate: ${filename} (${subfolder}/${filename} exists)`,
              );
            }
          } catch {
            // Flat file might not exist or already deleted, but still counts as skipped
            result.skippedFiles.push(`${subfolder}/${filename}`);
          }
          continue;
        }

        // Create target directory if needed
        await fs.mkdir(targetDir, { recursive: true });

        // Move file from flat to subfolder
        await fs.rename(flatPath, targetPath);
        movedCount++;
        result.totalMoved++;
        result.movedFiles.push(`${subfolder}/${filename}`);

        if (verbose) {
          logger.info(`[bejamas-ui] Moved ${filename} → ${subfolder}/${filename}`);
        }
      }

      if (movedCount > 0 && verbose) {
        logger.info(
          `[bejamas-ui] Reorganized ${componentName} into ${subfolder}/`,
        );
      }
    } catch (err) {
      // Non-fatal: log and continue with other components
      if (verbose) {
        logger.warn(
          `[bejamas-ui] Failed to reorganize ${componentName}: ${err}`,
        );
      }
    }
  }

  return result;
}

