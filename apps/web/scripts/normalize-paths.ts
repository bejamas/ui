import { existsSync, readdirSync, statSync, readFileSync, writeFileSync } from "fs";
import { extname, join, posix, resolve } from "path";

type RegistryFile = {
  path: string;
  type: string;
  content?: string;
};

type RegistryItem = {
  name?: string;
  type?: string;
  files?: RegistryFile[];
};

type RegistryManifest = {
  items?: RegistryItem[];
};

/**
 * Recursively get all .json files within the given directory.
 */
function getAllJsonFiles(dir: string): string[] {
  let results: string[] = [];
  for (const file of readdirSync(dir)) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllJsonFiles(fullPath));
    } else if (stat.isFile() && extname(fullPath) === ".json") {
      results.push(fullPath);
    }
  }
  return results;
}

const baseDir = join(__dirname, "../public/r/");
const registrySourceRoot = resolve(__dirname, "../../../packages/registry/src");
const sourceRegistryPath = join(__dirname, "../registry.json");
const files = getAllJsonFiles(baseDir);

function normalizeRegistrySource(content: string) {
  let next = content;

  if (next.includes("../../packages/ui/src/components/")) {
    next = next.replace(/(\.\.\/\.\.\/packages\/ui\/src\/components\/)/g, "ui/");
  }

  if (next.includes("@bejamas/ui/lib/utils")) {
    next = next.replace(/@bejamas\/ui\/lib\/utils/g, "@/lib/utils");
  }

  if (next.includes("@bejamas/registry/lib/utils")) {
    next = next.replace(/@bejamas\/registry\/lib\/utils/g, "@/lib/utils");
  }

  if (next.includes("@bejamas/registry/ui/")) {
    next = next.replace(/@bejamas\/registry\/ui\//g, "@/registry/bejamas/ui/");
  }

  if (next.includes("../../packages/registry/src/blocks/")) {
    next = next.replace(
      /\.\.\/\.\.\/packages\/registry\/src\/blocks\//g,
      "blocks/",
    );
  }

  return next;
}

function normalizeRegistryPath(filePath: string) {
  let next = filePath;

  if (next.startsWith("../../packages/ui/src/components/")) {
    next = next.replace("../../packages/ui/src/components/", "ui/");
  }

  if (next.startsWith("../../packages/registry/src/ui/")) {
    next = next.replace("../../packages/registry/src/ui/", "ui/");
  }

  if (next.startsWith("../../packages/registry/src/lib/")) {
    next = next.replace("../../packages/registry/src/lib/", "lib/");
  }

  if (next.startsWith("../../packages/registry/src/blocks/")) {
    next = next.replace("../../packages/registry/src/blocks/", "blocks/");
  }

  return next;
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

function inferRegistryFileType(filePath: string) {
  if (filePath.startsWith("ui/")) {
    return "registry:ui";
  }

  if (filePath.startsWith("lib/")) {
    return "registry:lib";
  }

  if (filePath.startsWith("blocks/")) {
    return "registry:component";
  }

  return null;
}

function resolveRegistrySourceImport(filePath: string) {
  const candidates = [filePath, `${filePath}.ts`, `${filePath}.astro`, `${filePath}.js`];

  for (const candidate of candidates) {
    const sourcePath = resolve(registrySourceRoot, candidate);
    if (existsSync(sourcePath)) {
      return {
        registryPath: candidate,
        sourcePath,
      };
    }
  }

  return null;
}

function augmentRegistryItem(item: RegistryItem) {
  if (!item.files?.length) {
    return false;
  }

  const queue = [...item.files];
  const knownPaths = new Set(item.files.map((entry) => entry.path));
  const localDirectories = new Set(
    item.files.map((entry) => posix.dirname(entry.path)),
  );
  let changed = false;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current?.content) {
      continue;
    }

    for (const relativeImport of extractLocalRelativeImports(current.content)) {
      const nextImportPath = posix.normalize(
        posix.join(posix.dirname(current.path), relativeImport),
      );
      const resolvedImport = resolveRegistrySourceImport(nextImportPath);

      if (!resolvedImport) {
        continue;
      }

      const nextPath = resolvedImport.registryPath;
      const type = inferRegistryFileType(nextPath);

      if (
        !type ||
        !nextPath.startsWith("ui/") ||
        knownPaths.has(nextPath) ||
        !Array.from(localDirectories).some(
          (directory) =>
            nextPath === directory || nextPath.startsWith(`${directory}/`),
        )
      ) {
        continue;
      }

      const nextFile = {
        path: nextPath,
        type,
        content: normalizeRegistrySource(readFileSync(resolvedImport.sourcePath, "utf8")),
      } satisfies RegistryFile;

      item.files.push(nextFile);
      queue.push(nextFile);
      knownPaths.add(nextPath);
      changed = true;
    }
  }

  return changed;
}

function normalizeRegistryItem(item: RegistryItem) {
  let changed = false;

  for (const entry of item.files ?? []) {
    const nextPath = normalizeRegistryPath(entry.path);
    const nextContent =
      typeof entry.content === "string"
        ? normalizeRegistrySource(entry.content)
        : entry.content;

    if (nextPath !== entry.path) {
      entry.path = nextPath;
      changed = true;
    }

    if (nextContent !== entry.content) {
      entry.content = nextContent;
      changed = true;
    }
  }

  return changed;
}

for (const file of files) {
  const content = readFileSync(file, "utf8");
  let newContent = normalizeRegistrySource(content);
  const isStyleRegistryFile =
    file.includes(join("public", "r", "styles")) || file.includes("/styles/");

  if (!isStyleRegistryFile) {
    const item = JSON.parse(newContent) as RegistryItem;
    const normalized = normalizeRegistryItem(item);
    const augmented = augmentRegistryItem(item);
    if (normalized || augmented) {
      newContent = `${JSON.stringify(item, null, 2)}\n`;
    }
  }

  if (newContent !== content) {
    writeFileSync(file, newContent, "utf8");
    console.log(`Updated: ${file}`);
  }
}

// The discovery index mirrors registry.json (components and blocks) without
// file contents, so the CLI can list what is installable from one request.
function buildDiscoveryIndex(manifest: RegistryManifest) {
  return (manifest.items ?? []).map((item) => ({
    ...item,
    files: item.files?.map(({ content: _content, ...file }) => ({
      ...file,
      path: normalizeRegistryPath(file.path),
    })),
  }));
}

function formatIndexJson(items: RegistryItem[]) {
  return `${JSON.stringify(items, null, 2).replace(
    /\[(?:\n\s+"(?:[^"\\]|\\.)*",?)+\n\s*\]/g,
    (array) =>
      `[${(JSON.parse(array) as string[])
        .map((value) => JSON.stringify(value))
        .join(", ")}]`,
  )}\n`;
}

const sourceRegistry = JSON.parse(
  readFileSync(sourceRegistryPath, "utf8"),
) as RegistryManifest;
const indexPath = join(baseDir, "index.json");
const nextIndex = formatIndexJson(buildDiscoveryIndex(sourceRegistry));

if (!existsSync(indexPath) || readFileSync(indexPath, "utf8") !== nextIndex) {
  writeFileSync(indexPath, nextIndex, "utf8");
  console.log(`Updated: ${indexPath}`);
}
