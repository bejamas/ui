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
  if (uiFiles.length === 0) {
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

  const uiFiles = (files ?? []).filter((file) => file.type === "registry:ui");

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
    // Dependencies share the flattened index.ts path, so its contents cannot
    // identify the owning component. Rebuild each barrel from its own files.
    if (filename === "index.ts") continue;
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

  if (await pathExists(targetDir)) {
    await repairComponentBarrel(targetDir, files, overwriteExisting);
  }
  return result;
}

export async function repairComponentBarrel(
  targetDir: string,
  files: RegistryFile[],
  overwriteExisting = false,
) {
  const localFiles = (await fs.readdir(targetDir))
    .filter((name) => name.endsWith(".astro"))
    .sort();
  if (!localFiles.length) return;
  const indexPath = path.join(targetDir, "index.ts");
  const existing = await fs.readFile(indexPath, "utf8").catch(() => "");
  const registryBarrel =
    files.find((file) => path.basename(file.path) === "index.ts")?.content ??
    "";
  const source = overwriteExisting || !existing ? registryBarrel : existing;
  // Preserve valid additional exports (such as buttonVariants), but discard
  // re-exports of files that belong to another component's flattened barrel.
  const cleaned = source
    .replace(
      /export\s*\{[^}]*\}\s*from\s*["'](\.\/[^"']+\.astro)["'];?/g,
      (statement, specifier) =>
        localFiles.includes(specifier.slice(2)) ? statement : "",
    )
    .trim();
  const additions = localFiles
    .filter((file) => {
      const name = path.basename(file, ".astro");
      return !new RegExp(`default\\s+as\\s+${name}\\b`).test(cleaned);
    })
    .map(
      (file) =>
        `export { default as ${path.basename(file, ".astro")} } from "./${file}";`,
    );
  const next = [cleaned, ...additions].filter(Boolean).join("\n") + "\n";
  if (next !== existing) await fs.writeFile(indexPath, next);
}

/** Resolve dependencies as well as the requested item before repairing output. */
export async function fetchRegistryTree(
  components: string[],
  registryUrl: string,
  style = "bejamas-juno",
): Promise<RegistryItem[]> {
  const seen = new Set<string>();
  const items: RegistryItem[] = [];
  async function visit(name: string) {
    if (seen.has(name)) return;
    seen.add(name);
    // Custom external registries are managed by shadcn, not this compatibility shim.
    if (!/^[a-z0-9-]+$/.test(name)) return;
    const item = await fetchRegistryItem(name, registryUrl, style);
    if (!item)
      throw new Error(
        `Unable to load registry item ${name} for installation validation.`,
      );
    for (const dependency of item.registryDependencies ?? [])
      await visit(dependency);
    items.push(item);
  }
  for (const name of components) await visit(name);
  return items;
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

  const items = await fetchRegistryTree(components, registryUrl, style);
  for (const item of items) {
    if (!shouldReorganizeRegistryUiFiles(item.files, uiDir)) continue;
    const componentResult = await reorganizeRegistryUiFiles(
      item.files,
      uiDir,
      verbose,
      overwriteExisting,
    );
    result.totalMoved += componentResult.totalMoved;
    result.movedFiles.push(...componentResult.movedFiles);
    result.skippedFiles.push(...componentResult.skippedFiles);
  }
  // Remove only a known generated flat barrel; preserve user-authored root exports.
  const flatIndex = path.join(uiDir, "index.ts");
  const flatContent = await fs.readFile(flatIndex, "utf8").catch(() => null);
  if (
    flatContent &&
    items.some((item) =>
      item.files?.some(
        (file) =>
          file.type === "registry:ui" &&
          path.basename(file.path) === "index.ts" &&
          file.content.trim() === flatContent.trim(),
      ),
    )
  )
    await fs.unlink(flatIndex);
  return result;
}

/** Update legacy template exports once the installed UI uses nested barrels. */
export async function repairUiPackageExports(
  uiDir: string,
  packageRoot: string,
) {
  const entries = await fs
    .readdir(uiDir, { withFileTypes: true })
    .catch(() => []);
  if (
    !entries.some((entry) => entry.isDirectory()) ||
    entries.some((entry) => entry.name.endsWith(".astro"))
  )
    return;
  const packagePath = path.join(packageRoot, "package.json");
  const manifest = JSON.parse(await fs.readFile(packagePath, "utf8"));
  if (!manifest.exports || typeof manifest.exports !== "object") return;
  const relativeUi = path
    .relative(packageRoot, uiDir)
    .split(path.sep)
    .join("/");
  if (relativeUi.startsWith("../")) return;
  const prefix = `./${relativeUi}`;
  let changed = false;
  for (const [specifier, target] of Object.entries(manifest.exports)) {
    if (target === `${prefix}/*.astro` || target === `${prefix}/*.ts`) {
      manifest.exports[specifier] = `${prefix}/*/index.ts`;
      changed = true;
    }
  }
  if (changed)
    await fs.writeFile(packagePath, JSON.stringify(manifest, null, 2) + "\n");
}
