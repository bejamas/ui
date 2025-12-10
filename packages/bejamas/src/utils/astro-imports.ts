import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { logger } from "@/src/utils/logger";
import { Config, getConfig } from "@/src/utils/get-config";

export function updateImportAliases(
  moduleSpecifier: string,
  config: Config,
  isRemote: boolean = false,
) {
  // Not a local import.
  if (!moduleSpecifier.startsWith("@/") && !isRemote) {
    return moduleSpecifier;
  }

  // This treats the remote as coming from a faux registry.
  let specifier = moduleSpecifier;
  if (isRemote && specifier.startsWith("@/")) {
    specifier = specifier.replace(/^@\//, "@/registry/new-york/");
  }

  // Not a registry import.
  if (!specifier.startsWith("@/registry/")) {
    // We fix the alias and return.
    const alias = config.aliases.components.split("/")[0];
    return specifier.replace(/^@\//, `${alias}/`);
  }

  if (specifier.match(/^@\/registry\/(.+)\/ui/)) {
    return specifier.replace(
      /^@\/registry\/(.+)\/ui/,
      config.aliases.ui ?? `${config.aliases.components}/ui`,
    );
  }

  if (
    config.aliases.components &&
    specifier.match(/^@\/registry\/(.+)\/components/)
  ) {
    return specifier.replace(
      /^@\/registry\/(.+)\/components/,
      config.aliases.components,
    );
  }

  if (config.aliases.lib && specifier.match(/^@\/registry\/(.+)\/lib/)) {
    return specifier.replace(/^@\/registry\/(.+)\/lib/, config.aliases.lib);
  }

  if (config.aliases.hooks && specifier.match(/^@\/registry\/(.+)\/hooks/)) {
    return specifier.replace(/^@\/registry\/(.+)\/hooks/, config.aliases.hooks);
  }

  return specifier.replace(/^@\/registry\/[^/]+/, config.aliases.components);
}

export function rewriteAstroImports(content: string, config: Config) {
  let updated = content;

  const utilsAlias = config.aliases?.utils;
  const workspaceAlias =
    typeof utilsAlias === "string" && utilsAlias.includes("/")
      ? utilsAlias.split("/")[0]
      : "@";
  const utilsImport = `${workspaceAlias}/lib/utils`;

  // Handle standard imports with specifiers, e.g. `import { x } from "path"`
  updated = updated.replace(
    /import\s+([\s\S]*?)\s+from\s+["']([^"']+)["']/g,
    (full, importsPart, specifier) => {
      const next = updateImportAliases(specifier, config, false);

      let finalSpec = next;
      const includesCn =
        typeof importsPart === "string" &&
        importsPart.split(/[{},\s]/).some((part: string) => part === "cn");

      if (
        includesCn &&
        config.aliases.utils &&
        (next === utilsImport || next === "@/lib/utils")
      ) {
        finalSpec =
          utilsImport === next
            ? next.replace(utilsImport, config.aliases.utils)
            : config.aliases.utils;
      }

      if (finalSpec === specifier) return full;
      return full.replace(specifier, finalSpec);
    },
  );

  // Handle bare imports, e.g. `import "path"`
  updated = updated.replace(/import\s+["']([^"']+)["']/g, (full, specifier) => {
    const next = updateImportAliases(specifier, config, false);
    if (next === specifier) return full;
    return full.replace(specifier, next);
  });

  return updated;
}

export async function fixAstroImports(cwd: string, isVerbose: boolean) {
  const config = await getConfig(cwd);
  if (!config) return;

  const searchRoots = new Set<string>([
    config.resolvedPaths.components,
    config.resolvedPaths.ui,
  ]);

  for (const root of Array.from(searchRoots)) {
    if (!root) continue;
    const astroFiles = await fg("**/*.astro", {
      cwd: root,
      absolute: true,
      dot: false,
    });

    for (const filePath of astroFiles) {
      const original = await fs.readFile(filePath, "utf8");
      const rewritten = rewriteAstroImports(original, config);
      if (rewritten === original) continue;
      await fs.writeFile(filePath, rewritten, "utf8");
      if (isVerbose) {
        logger.info(
          `[bejamas-ui] fixed imports in ${path.relative(cwd, filePath)}`,
        );
      }
    }
  }
}

