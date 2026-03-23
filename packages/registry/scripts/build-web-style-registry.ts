import fs from "node:fs/promises";
import path from "node:path";
import postcss, { type AtRule, type Declaration, type Rule } from "postcss";
import { fileURLToPath } from "node:url";
import { getGlobalStyleCss } from "../src/style-source";
import { STYLES, type Style } from "../src/catalog/styles";
import { fonts } from "../src/catalog/fonts";

type RegistryFile = {
  path: string;
  type: string;
  content?: string;
  target?: string;
};

type RegistryItem = {
  $schema?: string;
  name: string;
  type: string;
  files?: RegistryFile[];
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  css?: Record<string, unknown>;
  cssVars?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

type TokenMap = Map<string, string[]>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const webRoot = path.resolve(repoRoot, "apps/web");
const stylesRoot = path.resolve(webRoot, "public/r/styles");
const templateStyleDir = path.resolve(stylesRoot, STYLES[0].id);
const registrySourceRoot = path.resolve(__dirname, "..", "src");
const schemaUrl = "https://ui.shadcn.com/schema/registry-item.json";
const preservedTokens = new Set([
  "cn-font-heading",
  "cn-menu-target",
  "cn-menu-translucent",
]);
const templateCache = new Map<string, RegistryItem>();
const fileContentCache = new Map<string, string>();

function splitSelectors(selector: string) {
  const parts: string[] = [];
  let current = "";
  let bracketDepth = 0;
  let parenDepth = 0;

  for (const char of selector) {
    if (char === "[" ) bracketDepth += 1;
    if (char === "]" ) bracketDepth = Math.max(0, bracketDepth - 1);
    if (char === "(" ) parenDepth += 1;
    if (char === ")" ) parenDepth = Math.max(0, parenDepth - 1);

    if (char === "," && bracketDepth === 0 && parenDepth === 0) {
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

export function splitUtilityTokens(value: string) {
  const tokens: string[] = [];
  let current = "";
  let bracketDepth = 0;
  let parenDepth = 0;
  let braceDepth = 0;
  let quote: "'" | '"' | "" = "";

  for (const char of value.trim()) {
    if (quote) {
      current += char;
      if (char === quote) {
        quote = "";
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }

    if (char === "[") bracketDepth += 1;
    if (char === "]") bracketDepth = Math.max(0, bracketDepth - 1);
    if (char === "(") parenDepth += 1;
    if (char === ")") parenDepth = Math.max(0, parenDepth - 1);
    if (char === "{") braceDepth += 1;
    if (char === "}") braceDepth = Math.max(0, braceDepth - 1);

    if (
      /\s/.test(char) &&
      bracketDepth === 0 &&
      parenDepth === 0 &&
      braceDepth === 0
    ) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function sanitizeArbitraryValue(value: string) {
  return value
    .trim()
    .replace(/\s*,\s*/g, ",")
    .replace(/\s+/g, "_");
}

function declarationToUtility(declaration: Declaration) {
  return `[${declaration.prop}:${sanitizeArbitraryValue(declaration.value)}]`;
}

function applyPrefixes(prefixes: string[], tokens: string[]) {
  if (!prefixes.length) {
    return tokens;
  }

  return tokens.map((token) => `${prefixes.join("")}${token}`);
}

function attrToPrefix(attributeSource: string) {
  const attribute = attributeSource.trim();
  const equalsIndex = attribute.indexOf("=");

  if (equalsIndex === -1) {
    if (attribute.startsWith("data-")) {
      return `${attribute}:`;
    }
    return `[${attribute}]:`;
  }

  const rawName = attribute.slice(0, equalsIndex).trim();
  const rawValue = attribute
    .slice(equalsIndex + 1)
    .trim()
    .replace(/^['"]|['"]$/g, "");

  if (rawName.startsWith("data-")) {
    return `data-[${rawName.slice(5)}=${rawValue}]:`;
  }

  return `[${rawName}=${rawValue}]:`;
}

function parseClassSelector(selector: string) {
  const match = selector.match(/^\.([A-Za-z0-9_-]+)(.*)$/);

  if (!match) {
    return null;
  }

  const token = match[1];
  const rest = match[2].trim();

  if (!rest) {
    return { token, prefixes: [] as string[] };
  }

  const prefixes: string[] = [];
  const attrs = rest.match(/\[[^\]]+\]/g);

  if (!attrs || attrs.join("") !== rest) {
    return null;
  }

  for (const attr of attrs) {
    prefixes.push(attrToPrefix(attr.slice(1, -1)));
  }

  return { token, prefixes };
}

function parseNestedPrefixes(selector: string) {
  const trimmed = selector.trim();

  if (trimmed === "&:hover") return ["hover:"];
  if (trimmed === "&:focus") return ["focus:"];
  if (trimmed === "&:focus-visible") return ["focus-visible:"];
  if (trimmed === "&:active") return ["active:"];
  if (trimmed === "&:disabled") return ["disabled:"];

  if (trimmed.startsWith("&[")) {
    const attrs = trimmed.slice(1).match(/\[[^\]]+\]/g);
    if (attrs && attrs.join("") === trimmed.slice(1)) {
      return attrs.map((attr) => attrToPrefix(attr.slice(1, -1)));
    }
  }

  return [];
}

function pushUnique(target: string[], values: string[]) {
  for (const value of values) {
    if (!value || target.includes(value)) {
      continue;
    }
    target.push(value);
  }
}

function addUtilities(tokenMap: TokenMap, token: string, utilities: string[]) {
  const existing = tokenMap.get(token) ?? [];
  pushUnique(existing, utilities);
  tokenMap.set(token, existing);
}

function extractRuleUtilities(rule: Rule, prefixes: string[], tokenMap: TokenMap) {
  const selectors = splitSelectors(rule.selector)
    .map(parseClassSelector)
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  if (!selectors.length) {
    return;
  }

  const directUtilities: string[] = [];

  for (const node of rule.nodes ?? []) {
    if (node.type === "atrule" && node.name === "apply") {
      directUtilities.push(...splitUtilityTokens((node as AtRule).params));
      continue;
    }

    if (node.type === "decl") {
      directUtilities.push(declarationToUtility(node as Declaration));
      continue;
    }

    if (node.type === "rule") {
      const nestedPrefixes = parseNestedPrefixes((node as Rule).selector);
      if (!nestedPrefixes.length) {
        continue;
      }

      const nestedUtilities: string[] = [];

      for (const child of (node as Rule).nodes ?? []) {
        if (child.type === "atrule" && child.name === "apply") {
          nestedUtilities.push(...splitUtilityTokens((child as AtRule).params));
          continue;
        }

        if (child.type === "decl") {
          nestedUtilities.push(declarationToUtility(child as Declaration));
        }
      }

      for (const selector of selectors) {
        addUtilities(
          tokenMap,
          selector.token,
          applyPrefixes(
            [...prefixes, ...selector.prefixes, ...nestedPrefixes],
            nestedUtilities,
          ),
        );
      }
    }
  }

  for (const selector of selectors) {
    addUtilities(
      tokenMap,
      selector.token,
      applyPrefixes([...prefixes, ...selector.prefixes], directUtilities),
    );
  }
}

export function buildStyleTokenMap(styleName: Style["name"]) {
  const root = postcss.parse(getGlobalStyleCss(styleName));
  const tokenMap: TokenMap = new Map();

  for (const node of root.nodes) {
    if (node.type !== "rule") {
      continue;
    }

    extractRuleUtilities(node as Rule, [], tokenMap);
  }

  return tokenMap;
}

function expandCnTokens(value: string, tokenMap: TokenMap) {
  if (!value.includes("cn-")) {
    return value;
  }

  const tokens = splitUtilityTokens(value);
  const expanded: string[] = [];
  let changed = false;

  for (const token of tokens) {
    if (!token.startsWith("cn-") || preservedTokens.has(token)) {
      pushUnique(expanded, [token]);
      continue;
    }

    const utilities = tokenMap.get(token);
    if (!utilities?.length) {
      changed = true;
      continue;
    }

    changed = true;
    pushUnique(expanded, utilities);
  }

  return changed ? expanded.join(" ") : value;
}

export function transformRegistrySource(content: string, tokenMap: TokenMap) {
  const normalizedImports = content.replace(
    /@bejamas\/registry\/lib\//g,
    "@/lib/",
  );

  return normalizedImports.replace(
    /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g,
    (match, quote, value) => {
      if (typeof value !== "string" || !value.includes("cn-")) {
        return match;
      }

      const next = expandCnTokens(value, tokenMap);
      if (next === value) {
        return match;
      }

      return `${quote}${next}${quote}`;
    },
  );
}

export function buildBaseStyleCssObject() {
  return {
    '@import "tw-animate-css"': {},
    '@import "bejamas/tailwind.css"': {},
    "@layer base": {
      "*": {
        "@apply border-border outline-ring/50": {},
      },
      body: {
        "@apply bg-background text-foreground": {},
      },
    },
  };
}

async function readJson<T>(filepath: string) {
  return JSON.parse(await fs.readFile(filepath, "utf8")) as T;
}

async function ensureDir(filepath: string) {
  await fs.mkdir(filepath, { recursive: true });
}

async function listJsonFiles(filepath: string) {
  const entries = await fs.readdir(filepath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name);
}

async function readTemplateItem(name: string) {
  const cached = templateCache.get(name);
  if (cached) {
    return cached;
  }

  const item = await readJson<RegistryItem>(path.resolve(templateStyleDir, `${name}.json`));
  templateCache.set(name, item);
  return item;
}

function extractLocalRelativeImports(content: string) {
  const imports = new Set<string>();
  const pattern =
    /\b(?:import|export)\s+(?:type\s+)?[\s\S]*?\bfrom\s+["'](\.[^"']+)["']/g;

  for (const match of content.matchAll(pattern)) {
    const target = match[1];
    if (typeof target === "string") {
      imports.add(target);
    }
  }

  return Array.from(imports);
}

function resolveTemplateRelativePath(fromTemplatePath: string, relativeImport: string) {
  return path.posix.normalize(
    path.posix.join(path.posix.dirname(fromTemplatePath), relativeImport),
  );
}

function inferRegistryFileType(filePath: string) {
  if (filePath.startsWith("ui/")) {
    return "registry:ui";
  }

  if (filePath.startsWith("lib/")) {
    return "registry:lib";
  }

  throw new Error(`Unsupported registry file type for ${filePath}`);
}

async function resolveRegistrySourceImport(filePath: string) {
  const candidates = [filePath, `${filePath}.ts`, `${filePath}.astro`, `${filePath}.js`];

  for (const candidate of candidates) {
    try {
      const sourcePath = resolveSourceFile(candidate);
      await fs.access(sourcePath);
      return {
        registryPath: candidate,
        sourcePath,
      };
    } catch {
      continue;
    }
  }

  return null;
}

function resolveSourceFile(templatePath: string) {
  if (templatePath.startsWith("ui/")) {
    return path.resolve(registrySourceRoot, templatePath.replace(/^ui\//, "ui/"));
  }

  if (templatePath.startsWith("lib/")) {
    return path.resolve(registrySourceRoot, templatePath.replace(/^lib\//, "lib/"));
  }

  throw new Error(`Unsupported registry source path: ${templatePath}`);
}

async function readSourceFile(filepath: string) {
  const cached = fileContentCache.get(filepath);
  if (cached) {
    return cached;
  }

  const content = await fs.readFile(filepath, "utf8");
  fileContentCache.set(filepath, content);
  return content;
}

async function collectTemplateFiles(template: RegistryItem) {
  const initialFiles = template.files ?? [];
  const discoveredFiles = [...initialFiles];
  const queue = [...initialFiles];
  const seen = new Set(initialFiles.map((file) => file.path));
  const localDirectories = new Set(
    initialFiles.map((file) => path.posix.dirname(file.path)),
  );

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const source = await readSourceFile(resolveSourceFile(current.path));

    for (const relativeImport of extractLocalRelativeImports(source)) {
      const nextImportPath = resolveTemplateRelativePath(current.path, relativeImport);
      const resolvedImport = await resolveRegistrySourceImport(nextImportPath);

      if (!resolvedImport) {
        continue;
      }

      const nextPath = resolvedImport.registryPath;

      if (
        seen.has(nextPath) ||
        !nextPath.startsWith("ui/") ||
        !Array.from(localDirectories).some(
          (directory) =>
            nextPath === directory || nextPath.startsWith(`${directory}/`),
        )
      ) {
        continue;
      }

      const nextFile = {
        path: nextPath,
        type: inferRegistryFileType(nextPath),
      } satisfies RegistryFile;

      seen.add(nextPath);
      discoveredFiles.push(nextFile);
      queue.push(nextFile);
    }
  }

  return discoveredFiles;
}

export async function buildStyleItem(style: Style) {
  const template = await readTemplateItem("index");

  return {
    ...template,
    $schema: schemaUrl,
    name: "index",
    type: "registry:style",
    dependencies: Array.from(
      new Set(["bejamas", ...(template.dependencies ?? [])]),
    ),
    files: [],
    cssVars: {},
    css: buildBaseStyleCssObject(),
  } satisfies RegistryItem;
}

export function buildFontItem(font: (typeof fonts)[number]) {
  return {
    ...font,
    $schema: schemaUrl,
  } satisfies RegistryItem;
}

async function buildRegistryItem(name: string, style: Style, tokenMap: TokenMap) {
  const template = await readTemplateItem(name);
  const templateFiles = await collectTemplateFiles(template);

  const files = await Promise.all(
    templateFiles.map(async (file) => {
      const sourcePath = resolveSourceFile(file.path);
      const source = await readSourceFile(sourcePath);

      return {
        ...file,
        content: transformRegistrySource(source, tokenMap),
      };
    }),
  );

  return {
    ...template,
    $schema: schemaUrl,
    files,
    registryDependencies:
      name === "index"
        ? template.registryDependencies
        : Array.from(new Set(["index", ...(template.registryDependencies ?? [])])),
  } satisfies RegistryItem;
}

async function removeStaleJsonFiles(styleDir: string, nextFiles: Set<string>) {
  const existing = await listJsonFiles(styleDir);

  await Promise.all(
    existing
      .filter((filename) => !nextFiles.has(filename))
      .map((filename) => fs.unlink(path.resolve(styleDir, filename))),
  );
}

async function writeStyleRegistry(style: Style, itemNames: string[]) {
  const tokenMap = buildStyleTokenMap(style.name);
  const styleDir = path.resolve(stylesRoot, style.id);
  const fontNames = fonts.map((font) => font.name);
  const nextFiles = new Set<string>([
    "index.json",
    ...itemNames.map((name) => `${name}.json`),
    ...fontNames.map((name) => `${name}.json`),
  ]);

  await ensureDir(styleDir);
  await removeStaleJsonFiles(styleDir, nextFiles);

  const styleItem = await buildStyleItem(style);
  await fs.writeFile(
    path.resolve(styleDir, "index.json"),
    `${JSON.stringify(styleItem, null, 2)}\n`,
    "utf8",
  );

  for (const name of itemNames) {
    const item = await buildRegistryItem(name, style, tokenMap);
    await fs.writeFile(
      path.resolve(styleDir, `${name}.json`),
      `${JSON.stringify(item, null, 2)}\n`,
      "utf8",
    );
  }

  for (const font of fonts) {
    await fs.writeFile(
      path.resolve(styleDir, `${font.name}.json`),
      `${JSON.stringify(buildFontItem(font), null, 2)}\n`,
      "utf8",
    );
  }
}

async function getTemplateItemNames() {
  return (await listJsonFiles(templateStyleDir))
    .filter((filename) => filename !== "index.json")
    .map((filename) => filename.replace(/\.json$/, ""))
    .sort();
}

async function buildStylesIndex() {
  const styles = STYLES.map((style) => ({
    name: style.id,
    label: style.title,
  }));

  await fs.writeFile(
    path.resolve(stylesRoot, "index.json"),
    `${JSON.stringify(styles, null, 2)}\n`,
    "utf8",
  );
}

export async function buildWebStyleRegistry() {
  await ensureDir(stylesRoot);
  const itemNames = await getTemplateItemNames();

  for (const style of STYLES) {
    await writeStyleRegistry(style, itemNames);
  }

  await buildStylesIndex();
}

if (import.meta.main) {
  await buildWebStyleRegistry();
}
