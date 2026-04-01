import { promises as fs } from "node:fs";
import path from "node:path";
import { getConfig } from "@/src/utils/get-config";

function toRegistryName(filename: string) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

async function pathExists(filepath: string) {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

export async function detectInstalledUiComponents(uiDir: string) {
  if (!(await pathExists(uiDir))) {
    return [];
  }

  const entries = await fs.readdir(uiDir, { withFileTypes: true });
  const components = new Set<string>();

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const entryPath = path.resolve(uiDir, entry.name);

    if (entry.isDirectory()) {
      const childEntries = await fs.readdir(entryPath, { withFileTypes: true });
      const hasComponentFile = childEntries.some(
        (child) =>
          child.isFile() &&
          (/\.(astro|tsx|jsx)$/.test(child.name) ||
            /^(index\.(ts|js|tsx|jsx))$/.test(child.name)),
      );

      if (hasComponentFile) {
        components.add(entry.name);
      }

      continue;
    }

    if (
      entry.isFile() &&
      /\.(astro|tsx|jsx)$/.test(entry.name) &&
      !entry.name.startsWith("index.")
    ) {
      components.add(toRegistryName(entry.name));
    }
  }

  return Array.from(components).sort();
}

export async function getInstalledUiComponents(cwd: string) {
  const config = await getConfig(cwd);
  if (!config) {
    return [];
  }

  return detectInstalledUiComponents(config.resolvedPaths.ui);
}
