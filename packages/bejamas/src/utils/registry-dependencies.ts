import { getHeadlessDependencies } from "@bejamas/registry/lib/headless-dependencies";
import fs from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import { getPackageManager } from "./get-package-manager";
import type { RegistryItem } from "./reorganize-components";

export function missingRegistryDependencies(
  manifest: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  },
  items: RegistryItem[],
) {
  const declared = { ...manifest.devDependencies, ...manifest.dependencies };
  const candidates = new Map<string, string>();
  for (const item of items) {
    for (const specifier of item.dependencies ?? []) {
      const name = specifier.match(/^(@[^/]+\/[^@/]+|[^@/]+)/)?.[1];
      if (name && !declared[name]) candidates.set(name, specifier);
    }
  }
  for (const item of items) {
    for (const name of getHeadlessDependencies(item.files ?? [])) {
      if (!declared[name] && !candidates.has(name)) candidates.set(name, name);
    }
  }
  return [...candidates.values()].sort();
}

export async function ensureRegistryDependencies(
  cwd: string,
  items: RegistryItem[],
) {
  const manifest = JSON.parse(
    await fs.readFile(path.join(cwd, "package.json"), "utf8"),
  );
  const missing = missingRegistryDependencies(manifest, items);
  if (!missing.length) return;
  const manager = await getPackageManager(cwd);
  await execa(manager, [manager === "npm" ? "install" : "add", ...missing], {
    cwd,
    stdio: "inherit",
  });
}
