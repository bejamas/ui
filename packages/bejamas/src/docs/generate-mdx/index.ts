import { mkdirSync, existsSync } from "fs";
import { readdir, readFile, writeFile } from "fs/promises";
import { join, extname, dirname, relative, basename } from "path";
import {
  RESERVED_COMPONENTS,
  slugify,
  extractFrontmatter,
  toIdentifier,
  parseJsDocMetadata,
  extractPropsFromAstroProps,
  extractPropsFromDeclaredProps,
  resolveUiRoot,
  resolveOutDir,
  normalizeUsageMDX,
  normalizeBlockMDX,
  detectHasImportTopLevel,
  discoverExamples,
  extractComponentTagsFromMDX,
  createSourceFileFromFrontmatter,
} from "./utils";
import { buildMdx } from "./mdx-builder";
import { logger } from "@/src/utils/logger";
import { spinner } from "@/src/utils/spinner";
import { getConfig } from "@/src/utils/get-config";

interface ComponentEntry {
  /** The main component name (PascalCase), e.g., "Card" */
  name: string;
  /** Path to the main .astro file */
  filePath: string;
  /** The folder name (lowercase/kebab-case), e.g., "card" */
  folderName: string;
  /** Whether this is a folder-based component with barrel exports */
  isFolder: boolean;
  /** List of subcomponent names exported from the barrel, e.g., ["CardHeader", "CardTitle"] */
  namedExports: string[];
}

/**
 * Discover components in the components directory.
 * Supports both:
 * - Old pattern: flat .astro files in components/
 * - New pattern: folders with index.ts barrel exports
 */
async function discoverComponents(
  componentsDir: string,
): Promise<ComponentEntry[]> {
  const entries: ComponentEntry[] = [];
  const dirEntries = await readdir(componentsDir, { withFileTypes: true });

  for (const entry of dirEntries) {
    if (entry.isDirectory()) {
      // New pattern: folder with barrel exports
      const folderPath = join(componentsDir, entry.name);
      const indexPath = join(folderPath, "index.ts");

      if (existsSync(indexPath)) {
        // Parse the barrel file to find exports
        const indexContent = await readFile(indexPath, "utf-8");
        const namedExports = parseBarrelExports(indexContent);

        // Find the main component (first export or the one matching folder name)
        const mainComponentName = findMainComponent(namedExports, entry.name);

        if (mainComponentName) {
          const mainFilePath = join(folderPath, `${mainComponentName}.astro`);

          if (existsSync(mainFilePath)) {
            // Filter out the main component from namedExports (it will be imported separately)
            const subComponents = namedExports.filter(
              (n) => n !== mainComponentName,
            );

            entries.push({
              name: mainComponentName,
              filePath: mainFilePath,
              folderName: entry.name,
              isFolder: true,
              namedExports: subComponents,
            });
          }
        }
      }
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === ".astro") {
      // Old pattern: flat .astro file
      const componentName = entry.name.replace(/\.astro$/i, "");
      entries.push({
        name: componentName,
        filePath: join(componentsDir, entry.name),
        folderName: "",
        isFolder: false,
        namedExports: [],
      });
    }
  }

  return entries;
}

/**
 * Parse a barrel (index.ts) file to extract named exports.
 * Handles patterns like:
 * - export { default as Card } from "./Card.astro";
 * - export { default as CardHeader } from "./CardHeader.astro";
 */
function parseBarrelExports(content: string): string[] {
  const exports: string[] = [];

  // Match: export { default as ComponentName } from "..."
  const exportRegex = /export\s*\{\s*default\s+as\s+(\w+)\s*\}/g;
  let match: RegExpExecArray | null;

  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }

  return exports;
}

/**
 * Find the main component from a list of exports.
 * The main component is typically the one that matches the folder name (PascalCase).
 */
function findMainComponent(
  exports: string[],
  folderName: string,
): string | null {
  if (exports.length === 0) return null;

  // Convert folder name to PascalCase for comparison
  // e.g., "card" -> "Card", "input-group" -> "InputGroup"
  const expectedName = folderName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  // First, try to find exact match
  const exactMatch = exports.find((e) => e === expectedName);
  if (exactMatch) return exactMatch;

  // Otherwise, return the first export (usually the main component)
  return exports[0];
}

async function main() {
  const DEBUG =
    process.env.BEJAMAS_DEBUG === "1" || process.env.BEJAMAS_DEBUG === "true";
  const cwd =
    process.env.BEJAMAS_DOCS_CWD && process.env.BEJAMAS_DOCS_CWD.length
      ? (process.env.BEJAMAS_DOCS_CWD as string)
      : process.cwd();
  const config = await getConfig(cwd);
  const componentsAlias = (
    config?.aliases?.ui ||
    config?.aliases?.components ||
    "@bejamas/ui/components"
  ).replace(/\/$/, "");
  const componentsDirFromConfig =
    config?.resolvedPaths?.ui || config?.resolvedPaths?.components;
  let uiRoot = resolveUiRoot(cwd);
  let componentsDir = join(uiRoot, "src", "components");
  if (componentsDirFromConfig) {
    componentsDir = componentsDirFromConfig;
    uiRoot = dirname(dirname(componentsDirFromConfig));
  }
  if (!existsSync(componentsDir)) {
    // Fallback to ui package components if the configured path is missing.
    componentsDir = join(uiRoot, "src", "components");
  }
  const outDir = resolveOutDir(cwd);
  mkdirSync(outDir, { recursive: true });

  if (DEBUG) {
    logger.info(`[docs-generator] cwd: ${cwd}`);
    logger.info(`[docs-generator] uiRoot: ${uiRoot}`);
    logger.info(`[docs-generator] componentsDir: ${componentsDir}`);
    logger.info(`[docs-generator] outDir: ${outDir}`);
  }

  // Discover all components (both flat files and folders)
  const components = await discoverComponents(componentsDir);

  if (DEBUG) {
    logger.info(`[docs-generator] components found: ${components.length}`);
    if (components.length) {
      logger.info(
        `[docs-generator] first few: ${components
          .slice(0, 5)
          .map((c) => c.name)
          .join(", ")}`,
      );
    }
  }

  let generatedCount = 0;
  const total = components.length;
  const spin = spinner(`Generating docs (0/${total})`).start();

  for (const component of components) {
    const { name: pascal, filePath, folderName, isFolder, namedExports } = component;

    const astroFile = await readFile(filePath, "utf-8");
    const frontmatterCode = extractFrontmatter(astroFile);
    const sourceFile = createSourceFileFromFrontmatter(frontmatterCode);
    const meta = parseJsDocMetadata(frontmatterCode);
    const declaredProps = extractPropsFromDeclaredProps(sourceFile);
    const destructuredProps = extractPropsFromAstroProps(sourceFile);

    // Build props table preferring declared types; merge defaults from destructuring
    const defaultsMap = new Map<string, string | null>();
    for (const p of destructuredProps) {
      if (p.name && p.hasDefault) {
        defaultsMap.set(p.name, p.defaultValue || null);
      }
    }

    const propsTable = (declaredProps.length ? declaredProps : []).map((p) => ({
      name: p.name,
      type: p.type,
      required: !p.optional,
      defaultValue: defaultsMap.has(p.name) ? defaultsMap.get(p.name)! : null,
    }));

    const slug = slugify(pascal);
    const title = meta.title || meta.name || pascal;
    const description = meta.description || "";
    const descriptionBodyMDX = (meta as any).descriptionBodyMDX || "";
    const figmaUrl = (meta as any).figmaUrl || "";
    // Do not display props if there is no declared Props
    const propsList = "";

    const importName = pascal;
    // Use folder-based barrel import for new pattern, file-based for old pattern
    const importPath = isFolder
      ? `${componentsAlias}/${folderName}`
      : `${componentsAlias}/${pascal}.astro`;

    const { text: usageMDX, hasImport: hasImportUsage } = normalizeUsageMDX(
      meta.usageMDX || "",
      pascal,
    );
    const primaryExampleMDX = normalizeBlockMDX(
      meta.primaryExampleMDX || "",
    ).trim();
    const examplesMDX = normalizeBlockMDX(meta.examplesMDX || "").trim();
    const hasImportExamples = detectHasImportTopLevel(examplesMDX, pascal);
    const hasImportPrimary = detectHasImportTopLevel(primaryExampleMDX, pascal);
    const hasImport = hasImportUsage || hasImportExamples || hasImportPrimary;

    let exampleRelPaths: string[] = [];
    let examples: Array<{
      importName: string;
      importPath: string;
      title: string;
      source: string;
    }> = [];
    const examplesBlocksRaw = examplesMDX;
    const examplesBlocks = parseExamplesBlocks(examplesBlocksRaw);
    if (examplesBlocks.length === 0) {
      exampleRelPaths = await discoverExamples(filePath, componentsDir);
      examples = (exampleRelPaths || []).map((rel) => {
        const posixRel = rel
          .split(require("path").sep)
          .join(require("path").posix.sep);
        const importPathEx = `${componentsAlias}/${posixRel}`;
        const abs = join(componentsDir, rel);
        const source = require("fs").readFileSync(abs, "utf-8");
        const base = toIdentifier(
          require("path").basename(rel, require("path").extname(rel)),
        );
        const importNameEx = `${pascal}${base}`;
        const titleEx = base;
        return { importName: importNameEx, importPath: importPathEx, title: titleEx, source };
      });
    }

    const usedInUsage = extractComponentTagsFromMDX(usageMDX).filter(
      (n) => n !== pascal,
    );
    const usedInExamples = extractComponentTagsFromMDX(examplesMDX).filter(
      (n) => n !== pascal,
    );
    const usedInPrimary = extractComponentTagsFromMDX(primaryExampleMDX).filter(
      (n) => n !== pascal,
    );
    const autoSet = new Set<string>([
      ...usedInUsage,
      ...usedInExamples,
      ...usedInPrimary,
    ]);

    // For folder-based components, add subcomponents used in examples to namedExports
    const usedNamedExports = isFolder
      ? namedExports.filter((n) => autoSet.has(n))
      : [];

    // Remove subcomponents from autoSet (they'll be included via namedExports)
    if (isFolder) {
      for (const n of namedExports) {
        autoSet.delete(n);
      }
    }

    const autoImports = Array.from(autoSet)
      .filter((name) => !RESERVED_COMPONENTS.has(name))
      .filter((name) => true);

    const lucideIcons = autoImports.filter((n) => /Icon$/.test(n));
    const uiAutoImports = autoImports.filter((n) => !/Icon$/.test(n));

    const mdx = buildMdx({
      importName,
      importPath,
      title,
      description,
      usageMDX,
      hasImport,
      propsList,
      propsTable,
      examples,
      examplesBlocks: parseExamplesBlocks(examplesBlocksRaw),
      autoImports: uiAutoImports,
      lucideIcons,
      primaryExampleMDX,
      componentSource: astroFile.trim(),
      commandName: slug,
      figmaUrl,
      descriptionBodyMDX,
      componentsAlias,
      // Pass subcomponents as named exports for folder-based components
      namedExports: isFolder ? usedNamedExports : undefined,
    });
    const outFile = join(outDir, `${slug}.mdx`);
    mkdirSync(dirname(outFile), { recursive: true });
    await writeFile(outFile, mdx, "utf-8");
    generatedCount += 1;
    spin.text = `Generating docs (${generatedCount}/${total}) - ${title}`;
    if (DEBUG) logger.info(`Generated ${outFile}`);
  }
  spin.succeed(
    `Created ${generatedCount} file${generatedCount === 1 ? "" : "s"}:`,
  );
  // log all files with relative paths, sorted alphabetically
  const relPaths = components
    .map((c) => {
      const slug = slugify(c.name);
      const outFile = join(outDir, `${slug}.mdx`);
      return relative(cwd, outFile);
    })
    .sort((a, b) => a.localeCompare(b));
  relPaths.forEach((p) => {
    logger.log(`  - ${p}`);
  });
  logger.break();
}

export function parseExamplesBlocks(
  examplesMDX: string,
): Array<{ title: string; body: string }> {
  if (!examplesMDX) return [];
  const lines = examplesMDX.split("\n");
  const blocks: Array<{ title: string; body: string[] }> = [];
  let current: { title: string; body: string[] } = { title: "", body: [] };
  for (const line of lines) {
    const heading = line.match(/^###\s+(.+)$/);
    if (heading) {
      if (current.title || current.body.length) blocks.push(current);
      current = { title: heading[1].trim(), body: [] };
      continue;
    }
    current.body.push(line);
  }
  if (current.title || current.body.length) blocks.push(current);
  return blocks.map((b, idx) => ({
    title: b.title || `Example ${idx + 1}`,
    body: b.body.join("\n").trim(),
  }));
}

export async function runDocsGenerator(): Promise<void> {
  await main();
}

if (
  process.env.BEJAMAS_SKIP_AUTO_RUN !== "1" &&
  process.env.BEJAMAS_SKIP_AUTO_RUN !== "true"
) {
  runDocsGenerator().catch((err) => {
    logger.error(String(err));
    process.exit(1);
  });
}
