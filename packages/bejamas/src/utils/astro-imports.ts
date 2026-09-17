import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { logger } from "@/src/utils/logger";
import { Config, getConfig } from "@/src/utils/get-config";
import { rewriteAstroIcons } from "@/src/utils/icon-transform";
import { rewriteAstroMenus } from "@/src/utils/menu-transform";

export function updateImportAliases(
  moduleSpecifier: string,
  config: Config,
  isRemote: boolean = false,
) {
  // Upstream shadcn can shorten a scoped workspace alias to @repo/lib.
  const scope = config.aliases.components.split("/")[0];
  for (const [segment, alias] of [
    ["lib/utils", config.aliases.utils],
    ["lib", config.aliases.lib],
    ["hooks", config.aliases.hooks],
  ] as const) {
    if (!alias) continue;
    for (const prefix of [`@/${segment}`, `${scope}/${segment}`]) {
      if (
        moduleSpecifier === prefix ||
        moduleSpecifier.startsWith(`${prefix}/`)
      ) {
        return alias + moduleSpecifier.slice(prefix.length);
      }
    }
  }
  // Not a local import.
  if (!moduleSpecifier.startsWith("@/") && !isRemote) {
    return moduleSpecifier;
  }

  // This treats the remote as coming from a faux registry.
  let specifier = moduleSpecifier;
  if (isRemote && specifier.startsWith("@/")) {
    specifier = specifier.replace(
      /^@\//,
      `@/registry/${config.style || "bejamas-juno"}/`,
    );
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

  updated = updated.replace(
    /(?:export\s+(?:type\s+)?(?:\{[^}]*\}|\*)\s+from\s*|import\s*\(\s*)["']([^"']+)["']/g,
    (full, specifier) =>
      full.replace(specifier, updateImportAliases(specifier, config)),
  );

  // Handle bare imports, e.g. `import "path"`
  updated = updated.replace(/import\s+["']([^"']+)["']/g, (full, specifier) => {
    const next = updateImportAliases(specifier, config, false);
    if (next === specifier) return full;
    return full.replace(specifier, next);
  });

  updated = rewriteAstroMenus(updated, config.menuColor);

  return rewriteAstroIcons(updated, config.iconLibrary);
}

export function getConfiguredSourceRoots(config: Config) {
  return Array.from(
    new Set(
      [
        config.resolvedPaths.components,
        config.resolvedPaths.ui,
        config.resolvedPaths.lib,
        config.resolvedPaths.hooks,
      ].filter((root): root is string => Boolean(root)),
    ),
  );
}

export function isPathWithin(filePath: string, root: string) {
  const relative = path.relative(root, filePath);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

/**
 * Which files to repair: every source file under the configured aliases, or an
 * explicit list (for example block files written outside those roots).
 */
export type AstroImportRepairScope =
  { kind: "configured-roots" } | { kind: "files"; paths: readonly string[] };

export async function fixAstroImports(
  cwd: string,
  isVerbose: boolean,
  targetConfig?: Config | null,
  scope: AstroImportRepairScope = { kind: "configured-roots" },
) {
  const config = targetConfig ?? (await getConfig(cwd));
  if (!config) return;

  const files = new Set<string>();

  if (scope.kind === "files") {
    for (const filePath of scope.paths) {
      const absolutePath = path.resolve(cwd, filePath);
      if (!/\.(?:astro|ts|js)$/.test(absolutePath)) continue;
      const stats = await fs.stat(absolutePath).catch(() => null);
      if (stats?.isFile()) files.add(absolutePath);
    }
  } else {
    for (const root of getConfiguredSourceRoots(config)) {
      const matches = await fg("**/*.{astro,ts,js}", {
        cwd: root,
        absolute: true,
        dot: false,
      });
      for (const filePath of matches) files.add(filePath);
    }
  }

  for (const filePath of files) {
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
