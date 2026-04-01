import fs from "node:fs/promises";
import path from "node:path";

export const DEFAULT_UI_STYLE = "juno";

type RegistryFile = {
  path: string;
  type: string;
  content?: string;
};

type RegistryItem = {
  name: string;
  type: string;
  files?: RegistryFile[];
  dependencies?: string[];
};

type GeneratedUiOutput = {
  style: string;
  styleId: string;
  files: Map<string, string>;
  dependencies: Set<string>;
  outputRoot: string;
};

type SyncResult = {
  staleFiles: string[];
  unexpectedFiles: string[];
  missingDependencies: string[];
};

const repoRoot = path.resolve(import.meta.dir, "../../..");
const packageRoot = path.resolve(import.meta.dir, "..");
const registryRoot = path.resolve(repoRoot, "packages/registry");
const styleRegistryRoot = path.resolve(repoRoot, "apps/web/public/r/styles");
const registryLibRoot = path.resolve(registryRoot, "src/lib");
const defaultOutputRoot = path.resolve(packageRoot, "src");
const packageJsonPath = path.resolve(packageRoot, "package.json");

function resolveStyleId(style: string) {
  return style.startsWith("bejamas-") ? style : `bejamas-${style}`;
}

function resolveStyleRegistryPath(style: string) {
  return path.resolve(styleRegistryRoot, resolveStyleId(style));
}

function resolveOutputRoot(outputRoot?: string) {
  if (!outputRoot) {
    return defaultOutputRoot;
  }

  return path.isAbsolute(outputRoot)
    ? outputRoot
    : path.resolve(repoRoot, outputRoot);
}

function resolveGeneratedRoots(outputRoot: string) {
  return {
    root: outputRoot,
    componentsRoot: path.resolve(outputRoot, "components"),
    libRoot: path.resolve(outputRoot, "lib"),
  };
}

async function readRegistryItems(style: string) {
  const stylePath = resolveStyleRegistryPath(style);
  const entries = await fs.readdir(stylePath, { withFileTypes: true });
  const items: RegistryItem[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const item = JSON.parse(
      await fs.readFile(path.resolve(stylePath, entry.name), "utf8"),
    ) as RegistryItem;
    items.push(item);
  }

  return items;
}

function isGeneratedItem(item: RegistryItem) {
  return item.type === "registry:ui" || item.type === "registry:lib";
}

function isDependencyItem(item: RegistryItem) {
  return (
    item.type === "registry:ui" ||
    item.type === "registry:lib" ||
    item.type === "registry:style"
  );
}

function resolveOutputPath(
  registryPath: string,
  roots: ReturnType<typeof resolveGeneratedRoots>,
) {
  if (registryPath.startsWith("ui/")) {
    return path.resolve(
      roots.componentsRoot,
      registryPath.replace(/^ui\//u, ""),
    );
  }

  if (registryPath.startsWith("lib/")) {
    return path.resolve(roots.libRoot, registryPath.replace(/^lib\//u, ""));
  }

  throw new Error(`Unsupported generated registry path: ${registryPath}`);
}

function rewriteArtifactContentForUiPackage(content: string) {
  return content
    .replaceAll("@bejamas/registry/lib/", "@bejamas/ui/lib/")
    .replaceAll("@/lib/", "@bejamas/ui/lib/")
    .replaceAll("@/components/", "@bejamas/ui/components/");
}

function withGeneratedBanner(
  filePath: string,
  source: string,
  sourceLabel: string,
) {
  const relativePath = path
    .relative(repoRoot, filePath)
    .replaceAll(path.sep, "/");
  const banner = `Generated from ${sourceLabel}. Do not edit ${relativePath} directly.`;

  if (filePath.endsWith(".ts")) {
    return `// ${banner}\n${source}`;
  }

  if (filePath.endsWith(".astro") && source.startsWith("---\n")) {
    return source.replace(/^---\n/u, `---\n// ${banner}\n`);
  }

  if (filePath.endsWith(".astro")) {
    return `<!-- ${banner} -->\n${source}`;
  }

  return source;
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.resolve(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

async function readPackageDependencies() {
  const packageJson = JSON.parse(
    await fs.readFile(packageJsonPath, "utf8"),
  ) as {
    dependencies?: Record<string, string>;
  };

  return new Set(Object.keys(packageJson.dependencies ?? {}));
}

export async function buildGeneratedUiOutput(
  style: string = DEFAULT_UI_STYLE,
  outputRoot?: string,
): Promise<GeneratedUiOutput> {
  const styleId = resolveStyleId(style);
  const resolvedOutputRoot = resolveOutputRoot(outputRoot);
  const roots = resolveGeneratedRoots(resolvedOutputRoot);
  const items = await readRegistryItems(style);
  const files = new Map<string, string>();
  const dependencies = new Set<string>();

  for (const item of items) {
    if (isDependencyItem(item)) {
      for (const dependency of item.dependencies ?? []) {
        dependencies.add(dependency);
      }
    }

    if (!isGeneratedItem(item)) {
      continue;
    }

    for (const file of item.files ?? []) {
      if (!file.content) {
        throw new Error(
          `Missing content for ${item.name} file ${file.path} in ${styleId}`,
        );
      }

      const outputPath = resolveOutputPath(file.path, roots);
      const rewritten = rewriteArtifactContentForUiPackage(file.content);
      files.set(
        outputPath,
        withGeneratedBanner(outputPath, rewritten, `${styleId} style registry`),
      );
    }
  }

  for (const registryLibFile of await walk(registryLibRoot)) {
    if (!registryLibFile.endsWith(".ts")) {
      continue;
    }

    const relativePath = path.relative(registryLibRoot, registryLibFile);
    const outputPath = path.resolve(roots.libRoot, relativePath);
    const content = await fs.readFile(registryLibFile, "utf8");
    files.set(
      outputPath,
      withGeneratedBanner(
        outputPath,
        rewriteArtifactContentForUiPackage(content),
        "packages/registry/src/lib",
      ),
    );
  }

  return {
    style,
    styleId,
    files,
    dependencies,
    outputRoot: resolvedOutputRoot,
  };
}

export async function checkUiPackageSync(
  style: string = DEFAULT_UI_STYLE,
  outputRoot?: string,
): Promise<SyncResult> {
  const generated = await buildGeneratedUiOutput(style, outputRoot);
  const actualFiles = new Set<string>();
  const staleFiles: string[] = [];
  const unexpectedFiles: string[] = [];
  const roots = resolveGeneratedRoots(generated.outputRoot);
  const generatedRoots = [roots.componentsRoot, roots.libRoot] as const;

  for (const root of generatedRoots) {
    try {
      const files = await walk(root);
      for (const file of files) {
        actualFiles.add(file);
      }
    } catch {
      continue;
    }
  }

  for (const [filePath, expectedContent] of generated.files) {
    actualFiles.delete(filePath);

    let actualContent = "";
    try {
      actualContent = await fs.readFile(filePath, "utf8");
    } catch {
      staleFiles.push(path.relative(generated.outputRoot, filePath));
      continue;
    }

    if (actualContent !== expectedContent) {
      staleFiles.push(path.relative(generated.outputRoot, filePath));
    }
  }

  for (const filePath of actualFiles) {
    unexpectedFiles.push(path.relative(generated.outputRoot, filePath));
  }

  const packageDependencies = await readPackageDependencies();
  const missingDependencies = Array.from(generated.dependencies)
    .filter((dependency) => !packageDependencies.has(dependency))
    .sort();

  return {
    staleFiles: staleFiles.sort(),
    unexpectedFiles: unexpectedFiles.sort(),
    missingDependencies,
  };
}

export async function writeGeneratedUiOutput(
  style: string = DEFAULT_UI_STYLE,
  outputRoot?: string,
) {
  const generated = await buildGeneratedUiOutput(style, outputRoot);
  const roots = resolveGeneratedRoots(generated.outputRoot);
  const generatedRoots = [roots.componentsRoot, roots.libRoot] as const;

  for (const root of generatedRoots) {
    await fs.rm(root, { recursive: true, force: true });
    await fs.mkdir(root, { recursive: true });
  }

  for (const [filePath, content] of generated.files) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf8");
  }

  return generated;
}

function readFlag(args: string[], flag: string) {
  const inline = args.find((arg) => arg.startsWith(`${flag}=`));
  if (inline) {
    return inline.slice(flag.length + 1);
  }

  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

async function run() {
  const args = process.argv.slice(2);
  const style = readFlag(args, "--style") ?? DEFAULT_UI_STYLE;
  const outputRoot = readFlag(args, "--out-dir");
  const check = args.includes("--check");

  if (check) {
    const result = await checkUiPackageSync(style, outputRoot);
    const problems = [
      ...result.staleFiles.map((file) => `stale: ${file}`),
      ...result.unexpectedFiles.map((file) => `unexpected: ${file}`),
      ...result.missingDependencies.map((dep) => `missing dependency: ${dep}`),
    ];

    if (problems.length > 0) {
      console.error(
        `[ui-sync] packages/ui is out of sync with ${resolveStyleId(style)}`,
      );
      for (const problem of problems) {
        console.error(`- ${problem}`);
      }
      process.exitCode = 1;
      return;
    }

    console.info(`[ui-sync] packages/ui matches ${resolveStyleId(style)}`);
    return;
  }

  const generated = await writeGeneratedUiOutput(style, outputRoot);
  console.info(
    `[ui-sync] generated ${generated.files.size} files from ${generated.styleId} into ${path.relative(
      repoRoot,
      generated.outputRoot,
    )}`,
  );
}

if (import.meta.main) {
  await run();
}
