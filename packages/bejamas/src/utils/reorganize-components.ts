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
  files?: RegistryFile[];
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
}

export async function fetchRegistryItem(
  componentName: string,
  registryUrl: string,
  style = "bejamas-juno",
): Promise<RegistryItem | null> {
  const url = `${registryUrl}/styles/${style}/${componentName}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
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

export function getSubfolderFromPaths(files?: RegistryFile[]): string | null {
  if (!files || files.length === 0) {
    return null;
  }

  const uiFiles = files.filter((file) => file.type === "registry:ui");
  if (uiFiles.length < 2) {
    return null;
  }

  const subfolders = new Set<string>();

  for (const file of uiFiles) {
    const parts = file.path.split("/");
    const uiIndex = parts.indexOf("ui");
    if (uiIndex !== -1 && parts.length > uiIndex + 2) {
      subfolders.add(parts[uiIndex + 1]);
    }
  }

  if (subfolders.size === 1) {
    return Array.from(subfolders)[0];
  }

  if (uiFiles.length > 0) {
    const dirname = path.dirname(uiFiles[0].path);
    const folderName = path.basename(dirname);
    if (folderName && folderName !== "ui") {
      return folderName;
    }
  }

  return null;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function resolveShadcnUiRelativePath(filePath: string, uiDir: string) {
  const normalizedFilePath = filePath.replace(/^\/|\/$/g, "");
  const lastTargetSegment = path.basename(uiDir.replace(/^\/|\/$/g, ""));

  if (!lastTargetSegment) {
    return path.basename(normalizedFilePath);
  }

  const fileSegments = normalizedFilePath.split("/");
  const commonDirIndex = fileSegments.findIndex(
    (segment) => segment === lastTargetSegment,
  );

  if (commonDirIndex === -1) {
    return fileSegments[fileSegments.length - 1];
  }

  return fileSegments.slice(commonDirIndex + 1).join("/");
}

/**
 * Current upstream shadcn workspace installs flatten `ui/foo/Bar.astro` when
 * the resolved ui target ends in a segment like `components` instead of `ui`.
 * We keep reorganization only for that compatibility case.
 */
export function shouldReorganizeRegistryUiFiles(
  files: RegistryFile[] | undefined,
  uiDir: string,
) {
  if (!uiDir) {
    return false;
  }

  const subfolder = getSubfolderFromPaths(files);
  if (!subfolder) {
    return false;
  }

  const uiFiles = files.filter((file) => file.type === "registry:ui");

  return uiFiles.some((file) => {
    const relativePath = resolveShadcnUiRelativePath(file.path, uiDir);
    return !relativePath.includes("/");
  });
}

export interface ReorganizeResult {
  totalMoved: number;
  movedFiles: string[];
  skippedFiles: string[];
}

/**
 * Reorganizes one multi-file registry:ui item from flat output into its
 * expected subfolder. This is the filesystem-level compatibility shim.
 */
export async function reorganizeRegistryUiFiles(
  files: RegistryFile[] | undefined,
  uiDir: string,
  verbose: boolean,
  overwriteExisting = false,
): Promise<ReorganizeResult> {
  const result: ReorganizeResult = {
    totalMoved: 0,
    movedFiles: [],
    skippedFiles: [],
  };

  if (!uiDir || !files || files.length === 0) {
    return result;
  }

  const subfolder = getSubfolderFromPaths(files);
  if (!subfolder) {
    return result;
  }

  const uiFiles = files.filter((file) => file.type === "registry:ui");
  const targetDir = path.join(uiDir, subfolder);

  for (const file of uiFiles) {
    const filename = path.basename(file.path);
    const flatPath = path.join(uiDir, filename);
    const targetPath = path.join(targetDir, filename);

    if (!(await pathExists(flatPath))) {
      continue;
    }

    if (await pathExists(targetPath)) {
      if (overwriteExisting) {
        await fs.mkdir(targetDir, { recursive: true });
        await fs.unlink(targetPath);
        await fs.rename(flatPath, targetPath);
        result.totalMoved++;
        result.movedFiles.push(`${subfolder}/${filename}`);

        if (verbose) {
          logger.info(
            `[bejamas-ui] Replaced ${subfolder}/${filename} with the reinstalled version`,
          );
        }
        continue;
      }

      try {
        await fs.unlink(flatPath);
        result.skippedFiles.push(`${subfolder}/${filename}`);
        if (verbose) {
          logger.info(
            `[bejamas-ui] Removed flat duplicate: ${filename} (${subfolder}/${filename} exists)`,
          );
        }
      } catch {
        result.skippedFiles.push(`${subfolder}/${filename}`);
      }
      continue;
    }

    await fs.mkdir(targetDir, { recursive: true });
    await fs.rename(flatPath, targetPath);
    result.totalMoved++;
    result.movedFiles.push(`${subfolder}/${filename}`);

    if (verbose) {
      logger.info(`[bejamas-ui] Moved ${filename} -> ${subfolder}/${filename}`);
    }
  }

  return result;
}

export async function reorganizeComponents(
  components: string[],
  uiDir: string,
  registryUrl: string,
  verbose: boolean,
  style = "bejamas-juno",
  overwriteExisting = false,
): Promise<ReorganizeResult> {
  const result: ReorganizeResult = {
    totalMoved: 0,
    movedFiles: [],
    skippedFiles: [],
  };

  if (!uiDir || components.length === 0) {
    return result;
  }

  for (const componentName of components) {
    try {
      const registryItem = await fetchRegistryItem(
        componentName,
        registryUrl,
        style,
      );
      if (!registryItem) {
        if (verbose) {
          logger.info(
            `[bejamas-ui] Could not fetch registry for ${componentName}, skipping reorganization`,
          );
        }
        continue;
      }

      if (!shouldReorganizeRegistryUiFiles(registryItem.files, uiDir)) {
        continue;
      }

      const componentResult = await reorganizeRegistryUiFiles(
        registryItem.files,
        uiDir,
        verbose,
        overwriteExisting,
      );

      result.totalMoved += componentResult.totalMoved;
      result.movedFiles.push(...componentResult.movedFiles);
      result.skippedFiles.push(...componentResult.skippedFiles);

      if (componentResult.totalMoved > 0 && verbose) {
        const subfolder = getSubfolderFromPaths(registryItem.files);
        logger.info(
          `[bejamas-ui] Reorganized ${componentName} into ${subfolder}/`,
        );
      }
    } catch (err) {
      if (verbose) {
        logger.warn(
          `[bejamas-ui] Failed to reorganize ${componentName}: ${err}`,
        );
      }
    }
  }

  return result;
}
