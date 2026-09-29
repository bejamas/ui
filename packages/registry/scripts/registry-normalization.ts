/**
 * How registry sources are published. Shared by the styled registry build
 * (`build-web-style-registry.ts`) and the default registry post-processing
 * (`apps/web/scripts/normalize-paths.ts`) so both outputs stay identical.
 */

/**
 * Registry alias for shared UI. Both shadcn and the Bejamas installer rewrite
 * it to the project's configured `aliases.ui`.
 */
export const REGISTRY_UI_ALIAS = "@/registry/bejamas/ui/";

/** Source locations, as `registry.json` lists them, and their published prefix. */
export const SOURCE_PATH_PREFIXES = [
  // Generated UI package, the source of the default registry.
  ["../../packages/ui/src/components/", "ui/"],
  ["../../packages/registry/src/ui/", "ui/"],
  ["../../packages/registry/src/lib/", "lib/"],
  ["../../packages/registry/src/blocks/", "blocks/"],
] as const;

const IMPORT_REWRITES: [RegExp, string][] = [
  [/@bejamas\/registry\/lib\//g, "@/lib/"],
  [/@bejamas\/registry\/ui\//g, REGISTRY_UI_ALIAS],
  // Legacy UI package alias.
  [/@bejamas\/ui\/lib\/utils/g, "@/lib/utils"],
];

/** Map a source path to its published registry path. */
export function normalizeRegistryPath(filePath: string) {
  for (const [source, published] of SOURCE_PATH_PREFIXES) {
    if (filePath.startsWith(source)) {
      return published + filePath.slice(source.length);
    }
  }
  return filePath;
}

/** Rewrite workspace package imports to the aliases installers understand. */
export function normalizeRegistryImports(content: string) {
  return IMPORT_REWRITES.reduce(
    (next, [pattern, replacement]) => next.replace(pattern, replacement),
    content,
  );
}

/** Registry file type for a published path, or null when it is not a source. */
export function inferRegistryFileType(filePath: string) {
  if (filePath.startsWith("ui/")) return "registry:ui";
  if (filePath.startsWith("lib/")) return "registry:lib";
  if (filePath.startsWith("blocks/")) return "registry:component";
  return null;
}
