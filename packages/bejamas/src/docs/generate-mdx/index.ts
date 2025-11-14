import { mkdirSync } from "fs";
import { readdir, writeFile } from "fs/promises";
import { join, extname, dirname, relative } from "path";
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

async function main() {
  const DEBUG =
    process.env.BEJAMAS_DEBUG === "1" || process.env.BEJAMAS_DEBUG === "true";
  const cwd =
    process.env.BEJAMAS_DOCS_CWD && process.env.BEJAMAS_DOCS_CWD.length
      ? (process.env.BEJAMAS_DOCS_CWD as string)
      : process.cwd();
  const uiRoot = resolveUiRoot(cwd);
  const componentsDir = join(uiRoot, "src", "components");
  const outDir = resolveOutDir(cwd);
  mkdirSync(outDir, { recursive: true });

  if (DEBUG) {
    logger.info(`[docs-generator] cwd: ${cwd}`);
    logger.info(`[docs-generator] uiRoot: ${uiRoot}`);
    logger.info(`[docs-generator] componentsDir: ${componentsDir}`);
    logger.info(`[docs-generator] outDir: ${outDir}`);
  }

  const entriesDir = await readdir(componentsDir, { withFileTypes: true });
  const files = entriesDir.filter(
    (e) => e.isFile() && extname(e.name).toLowerCase() === ".astro",
  );
  if (DEBUG) {
    logger.info(`[docs-generator] components found: ${files.length}`);
    if (files.length)
      logger.info(
        `[docs-generator] first few: ${files
          .slice(0, 5)
          .map((f) => f.name)
          .join(", ")}`,
      );
  }

  let generatedCount = 0;
  const total = files.length;
  const spin = spinner(`Generating docs (0/${total})`).start();
  for (const f of files) {
    const filePath = join(componentsDir, f.name);
    const astroFile = await (
      await import("fs/promises")
    ).readFile(filePath, "utf-8");
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

    const slug = `${slugify(f.name)}`;
    const pascal = f.name.replace(/\.(astro)$/i, "");
    const title = meta.title || meta.name || pascal;
    const description = meta.description || "";
    const figmaUrl = (meta as any).figmaUrl || "";
    // Do not display props if there is no declared Props
    const propsList = "";

    const importName = pascal;
    const importPath = `@bejamas/ui/components/${pascal}.astro`;
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
        const importPath = `@bejamas/ui/components/${posixRel}`;
        const abs = join(componentsDir, rel);
        const source = require("fs").readFileSync(abs, "utf-8");
        const base = toIdentifier(
          require("path").basename(rel, require("path").extname(rel)),
        );
        const importName = `${pascal}${base}`;
        const title = base;
        return { importName, importPath, title, source };
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
  const relPaths = files
    .map((f) => {
      const slug = `${slugify(f.name)}`;
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
