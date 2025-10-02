import { existsSync, readFileSync } from "fs";
import { readdir } from "fs/promises";
import path, { dirname, extname, join, posix as pathPosix } from "path";
import { createRequire } from "module";
import { Project, SyntaxKind, SourceFile } from "ts-morph";

export const RESERVED_COMPONENTS: Set<string> = new Set([
  "Fragment",
  "CodePackageManagers",
  "DocsTabs",
  "DocsTabItem",
  "DocsCodePackageManagers",
  "Tabs",
  "TabItem",
]);

export function slugify(input: string): string {
  return input
    .replace(/\.(astro|md|mdx|tsx|ts|jsx|js)$/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .replace(/_+/g, "-")
    .toLowerCase();
}

export function extractFrontmatter(source: string): string {
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  return (match && match[1]) || "";
}

export function toIdentifier(name: string): string {
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, "");
  return /^[A-Za-z_]/.test(base) ? base : `Ex${base}`;
}

export function parseJsDocMetadata(
  frontmatterCode: string,
): Record<string, any> {
  const jsDocMatch = frontmatterCode.match(/\/\*\*([\s\S]*?)\*\//);
  if (!jsDocMatch) return {};
  const content = jsDocMatch[1];
  const lines = content.split("\n").map((l) => l.replace(/^\s*\*\s?/, ""));
  const meta: Record<string, any> = {};
  let inUsage = false;
  let inExamples = false;
  let inPrimaryExample = false;
  const usageLines: string[] = [];
  const examplesLines: string[] = [];
  const primaryExampleLines: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine;
    if (inUsage) {
      if (line.trim().startsWith("@")) {
        inUsage = false;
      } else {
        usageLines.push(line);
        continue;
      }
    }
    if (inPrimaryExample) {
      if (line.trim().startsWith("@")) {
        inPrimaryExample = false;
      } else {
        primaryExampleLines.push(line);
        continue;
      }
    }
    if (inExamples) {
      if (line.trim().startsWith("@")) {
        inExamples = false;
      } else {
        examplesLines.push(line);
        continue;
      }
    }
    if (line.trim().startsWith("@component"))
      meta.name = line.replace("@component", "").trim();
    else if (line.trim().startsWith("@title"))
      meta.title = line.replace("@title", "").trim();
    else if (line.trim().startsWith("@description"))
      meta.description = line.replace("@description", "").trim();
    else if (line.trim().startsWith("@usage")) {
      inUsage = true;
      continue;
    } else if (line.trim().startsWith("@examples")) {
      inExamples = true;
      continue;
    } else if (line.trim().startsWith("@example")) {
      inPrimaryExample = true;
      continue;
    }
  }
  if (usageLines.length) meta.usageMDX = usageLines.join("\n").trim();
  if (examplesLines.length) meta.examplesMDX = examplesLines.join("\n").trim();
  if (primaryExampleLines.length)
    meta.primaryExampleMDX = primaryExampleLines.join("\n").trim();
  return meta;
}

export function extractPropsFromAstroProps(sourceFile: SourceFile): Array<{
  name?: string;
  isRest?: boolean;
  hasDefault?: boolean;
  defaultValue?: string;
  alias?: string;
}> {
  // Helper: unwrap expressions like `(Astro.props as Props)`, `Astro.props as Props`,
  // `<Props>Astro.props`, `(Astro.props)!`, and parenthesized variants until we reach
  // the underlying PropertyAccessExpression.
  function unwrapAstroProps(node: any): any | null {
    let current: any = node;
    // Unwrap layers that can wrap the property access
    // AsExpression, TypeAssertion, SatisfiesExpression, NonNullExpression, ParenthesizedExpression
    // Keep drilling down via getExpression()
    // Guard against cycles by limiting iterations
    for (let i = 0; i < 10; i += 1) {
      const kind = current.getKind();
      if (kind === SyntaxKind.PropertyAccessExpression) {
        const expr = current.getExpression();
        if (
          expr &&
          expr.getText() === "Astro" &&
          current.getName() === "props"
        ) {
          return current;
        }
        return null;
      }
      if (
        kind === SyntaxKind.AsExpression ||
        kind === SyntaxKind.TypeAssertion ||
        // @ts-ignore - SatisfiesExpression may not exist in older TS versions
        kind === (SyntaxKind as any).SatisfiesExpression ||
        kind === SyntaxKind.NonNullExpression ||
        kind === SyntaxKind.ParenthesizedExpression
      ) {
        const next = current.getExpression && current.getExpression();
        if (!next) return null;
        current = next;
        continue;
      }
      return null;
    }
    return null;
  }

  const declarations = sourceFile.getDescendantsOfKind(
    SyntaxKind.VariableDeclaration,
  );
  const target = declarations.find((decl) => {
    const init = decl.getInitializer();
    if (!init) return false;
    return !!unwrapAstroProps(init);
  });
  if (!target) return [];
  const nameNode: any = target.getNameNode();
  if (!nameNode || nameNode.getKind() !== SyntaxKind.ObjectBindingPattern)
    return [];
  const obj = nameNode.asKindOrThrow(SyntaxKind.ObjectBindingPattern);
  return obj.getElements().map((el: any) => {
    const isRest = !!el.getDotDotDotToken();
    if (isRest) return { isRest: true, hasDefault: false, alias: el.getName() };
    const propertyNameNode = el.getPropertyNameNode();
    const name = el.getName();
    const propName = propertyNameNode ? propertyNameNode.getText() : name;
    const initializer = el.getInitializer();
    let defaultValue: string | undefined;
    if (initializer) defaultValue = initializer.getText();
    return { name: propName, hasDefault: initializer != null, defaultValue };
  });
}

export function extractPropsFromDeclaredProps(sourceFile: SourceFile): Array<{
  name: string;
  type: string;
  optional: boolean;
}> {
  // Prefer interface Props
  const iface = sourceFile.getInterface("Props");
  if (iface) {
    const properties = iface.getProperties();
    return properties.map((prop) => {
      const name = prop.getName();
      const typeNode = prop.getTypeNode();
      const typeText = typeNode ? typeNode.getText() : prop.getType().getText();
      const optional = prop.hasQuestionToken();
      return { name, type: typeText, optional };
    });
  }

  // Fallback: type Props = { ... }
  const typeAlias = sourceFile.getTypeAlias("Props");
  if (typeAlias) {
    const typeNode = typeAlias.getTypeNode();
    if (typeNode && typeNode.getKind() === SyntaxKind.TypeLiteral) {
      const literal = typeNode.asKindOrThrow(SyntaxKind.TypeLiteral);
      const properties = literal.getProperties();
      return properties.map((prop) => {
        const name = prop.getName();
        const tn = prop.getTypeNode();
        const typeText = tn ? tn.getText() : prop.getType().getText();
        const optional = prop.hasQuestionToken();
        return { name, type: typeText, optional };
      });
    }
  }

  return [];
}

export function resolveUiRoot(cwd: string): string {
  const require = createRequire(import.meta.url);

  const envRoot = process.env.BEJAMAS_UI_ROOT;
  if (envRoot && existsSync(path.join(envRoot, "package.json"))) {
    return envRoot;
  }

  try {
    const pkgPath = require.resolve("@bejamas/ui/package.json", {
      paths: [cwd],
    });
    return path.dirname(pkgPath);
  } catch {}

  let current = cwd;
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.join(current, "packages", "ui", "package.json");
    if (existsSync(candidate)) return path.dirname(candidate);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  try {
    const anyEntry = require.resolve("@bejamas/ui/*", { paths: [cwd] });
    return path.resolve(anyEntry, "..", "..");
  } catch {}

  throw new Error("Unable to locate @bejamas/ui in the workspace");
}

export function resolveOutDir(cwd: string): string {
  const envOut = process.env.BEJAMAS_DOCS_OUT_DIR;
  if (envOut && envOut.length) {
    return path.isAbsolute(envOut) ? envOut : path.resolve(cwd, envOut);
  }
  return path.resolve(cwd, "../../apps/web/src/content/docs/components");
}

export function detectHasImportTopLevel(
  block: string,
  pascalName: string,
): boolean {
  if (!block) return false;
  let inFence = false;
  const importLineRegex = new RegExp(
    `^\\s*import\\s+.*\\bfrom\\s+['"][^'"]+\\b${pascalName}\\.astro['"]`,
  );
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && importLineRegex.test(line)) return true;
  }
  return false;
}

export function hasImportOfTopLevel(
  block: string,
  componentName: string,
): boolean {
  if (!block) return false;
  let inFence = false;
  const importRegex = new RegExp(
    `^\\s*import\\s+[^;]*\\b${componentName}\\b[^;]*from\\s+['"][^'"]*(?:/|^)${componentName}\\.astro['"]`,
  );
  const lucideIconRegex = /Icon$/.test(componentName)
    ? new RegExp(
        `^\\s*import\\s+\\{[^}]*\\b${componentName}\\b[^}]*\\}\\s+from\\s+['"]@lucide/astro['"]`,
      )
    : null;
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (!inFence && importRegex.test(line)) return true;
    if (!inFence && lucideIconRegex && lucideIconRegex.test(line)) return true;
  }
  return false;
}

export function normalizeBlockMDX(block: string): string {
  if (!block) return "";
  return block.replace(
    /from\s+['"]@\/ui\/components\//g,
    "from '@bejamas/ui/components/",
  );
}

export function replaceDocsComponentTags(block: string): string {
  if (!block) return "";
  let inFence = false;
  const lines = block.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }
    const replaced = line
      .replace(/<Tabs(\b|\s)/g, "<DocsTabs$1")
      .replace(/<\/Tabs>/g, "</DocsTabs>")
      .replace(/<TabItem(\b|\s)/g, "<DocsTabItem$1")
      .replace(/<\/TabItem>/g, "</DocsTabItem>");
    out.push(replaced);
  }
  return out.join("\n");
}

export function normalizeUsageMDX(
  usageMDX: string,
  pascalName: string,
): { text: string; hasImport: boolean } {
  const normalized = normalizeBlockMDX(usageMDX);
  const hasImport = detectHasImportTopLevel(normalized, pascalName);
  return { text: normalized.trim(), hasImport };
}

export function extractComponentTagsFromMDX(block: string): string[] {
  if (!block) return [];
  let inFence = false;
  const found = new Set<string>();
  const tagRegex = /<([A-Z][A-Za-z0-9_]*)\b/g;
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    let match: RegExpExecArray | null;
    while ((match = tagRegex.exec(line)) !== null) {
      const name = match[1];
      found.add(name);
    }
  }
  return Array.from(found);
}

export async function discoverExamples(
  componentFilePath: string,
  componentsDir: string,
): Promise<string[]> {
  const fileBase = path.basename(
    componentFilePath,
    path.extname(componentFilePath),
  );
  const kebabBase = slugify(fileBase);
  const candidates = [
    join(dirname(componentFilePath), `${fileBase}.examples`),
    join(dirname(componentFilePath), `${kebabBase}.examples`),
  ];
  const found: string[] = [];
  for (const dir of candidates) {
    try {
      const items = await readdir(dir, { withFileTypes: true });
      for (const it of items) {
        if (it.isFile() && extname(it.name).toLowerCase() === ".astro") {
          const abs = join(dir, it.name);
          const relFromComponents = path
            .relative(componentsDir, abs)
            .split(path.sep)
            .join(pathPosix.sep);
          found.push(relFromComponents);
        }
      }
    } catch {}
  }
  return found;
}

export function createSourceFileFromFrontmatter(
  frontmatterCode: string,
): SourceFile {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile("Component.ts", frontmatterCode, {
    overwrite: true,
  });
}
