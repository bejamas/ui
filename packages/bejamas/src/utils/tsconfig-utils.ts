import { resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";

/**
 * Read and parse tsconfig.json from the project root
 */
export function readTsConfig(projectRoot: string): any | null {
  try {
    const tsconfigPath = resolve(projectRoot, "tsconfig.json");
    if (!existsSync(tsconfigPath)) return null;
    const raw = readFileSync(tsconfigPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Resolve an alias path (like @/components) using tsconfig.json paths
 */
export function resolveAliasPathUsingTsConfig(
  inputPath: string,
  projectRoot: string,
): string | null {
  const cfg = readTsConfig(projectRoot);
  if (!cfg || !cfg.compilerOptions) return null;
  const baseUrl: string = cfg.compilerOptions.baseUrl || ".";
  const paths: Record<string, string[] | string> =
    cfg.compilerOptions.paths || {};
  for (const [key, values] of Object.entries(paths)) {
    const pattern = key.replace(/\*/g, "(.*)");
    const re = new RegExp(`^${pattern}$`);
    const match = inputPath.match(re);
    if (!match) continue;
    const wildcard = match[1] || "";
    const first = Array.isArray(values) ? values[0] : values;
    if (!first) continue;
    const target = String(first).replace(/\*/g, wildcard);
    return resolve(projectRoot, baseUrl, target);
  }
  return null;
}
