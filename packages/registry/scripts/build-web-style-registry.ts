import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import postcss, {
  type AtRule,
  type ChildNode,
  type Declaration,
  type Rule,
} from "postcss";
import { fileURLToPath } from "node:url";
import { STYLES } from "../src/catalog/styles";
import { getGlobalStyleCss } from "../src/style-source";

type RegistryCssObject = {
  [key: string]: string | RegistryCssObject;
};

type RegistryFile = {
  path: string;
  type: "registry:ui" | "registry:lib";
  content: string;
};

type RegistryItem = {
  $schema: string;
  name: string;
  type: string;
  files: RegistryFile[];
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  css?: RegistryCssObject;
  cssVars?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourceRoot = path.resolve(__dirname, "../src");
const uiRoot = path.join(sourceRoot, "ui");
const libRoot = path.join(sourceRoot, "lib");
const outputRoot = path.resolve(__dirname, "../../../apps/web/public/r/styles");
const schemaUrl = "https://ui.shadcn.com/schema/registry-item.json";

function nodeToObject(
  node: ChildNode,
): [string, string | RegistryCssObject] | null {
  if (node.type === "rule") {
    const rule = node as Rule;
    const value: RegistryCssObject = {};

    rule.nodes?.forEach((child) => {
      const entry = nodeToObject(child);
      if (entry) {
        value[entry[0]] = entry[1];
      }
    });

    return [rule.selector, value];
  }

  if (node.type === "atrule") {
    const atRule = node as AtRule;
    const key = `@${atRule.name}${atRule.params ? ` ${atRule.params}` : ""}`;

    if (!atRule.nodes?.length) {
      return [key, {}];
    }

    const value: RegistryCssObject = {};
    atRule.nodes.forEach((child) => {
      const entry = nodeToObject(child);
      if (entry) {
        value[entry[0]] = entry[1];
      }
    });

    return [key, value];
  }

  if (node.type === "decl") {
    const declaration = node as Declaration;
    return [declaration.prop, declaration.value];
  }

  return null;
}

function buildRegistryStyleCss(style: (typeof STYLES)[number]["name"]) {
  const root = postcss.parse(getGlobalStyleCss(style));
  const result: RegistryCssObject = {
    '@import "tw-animate-css"': {},
    '@import "shadcn/tailwind.css"': {},
    "@layer base": {
      "*": {
        "@apply border-border outline-ring/50": {},
      },
      body: {
        "@apply bg-background text-foreground": {},
      },
    },
  };

  root.nodes.forEach((node) => {
    const entry = nodeToObject(node);
    if (entry) {
      result[entry[0]] = entry[1];
    }
  });

  return result;
}

function writeJson(filepath: string, value: unknown) {
  mkdirSync(path.dirname(filepath), { recursive: true });
  writeFileSync(filepath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function getUiComponentNames() {
  return readdirSync(uiRoot, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(path.join(uiRoot, entry.name, "index.ts")),
    )
    .map((entry) => entry.name)
    .sort();
}

function getLibItemNames() {
  return readdirSync(libRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => entry.name.replace(/\.ts$/, ""))
    .sort();
}

function readImportSpecifiers(content: string) {
  const matches = new Set<string>();
  const importFromRe =
    /(?:^|\n)\s*import(?:\s+type)?[\s\S]*?\s+from\s+["']([^"']+)["']/g;
  const bareImportRe = /(?:^|\n)\s*import\s+["']([^"']+)["']/g;

  for (const regex of [importFromRe, bareImportRe]) {
    let match: RegExpExecArray | null = regex.exec(content);
    while (match) {
      matches.add(match[1]);
      match = regex.exec(content);
    }
  }

  return [...matches];
}

function resolveImportFile(fromFile: string, specifier: string) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.astro`,
    path.join(base, "index.ts"),
    path.join(base, "index.astro"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function sortStrings(values: Iterable<string>) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function rewriteRegistryImports(content: string, styleId: string) {
  return content
    .replaceAll("@bejamas/registry/lib/", `@/registry/${styleId}/lib/`)
    .replaceAll("@bejamas/registry/ui/", `@/registry/${styleId}/ui/`);
}

function buildUiItem(name: string, styleId: string): RegistryItem {
  const componentRoot = path.join(uiRoot, name);
  const files = readdirSync(componentRoot)
    .filter((entry) => entry.endsWith(".astro") || entry.endsWith(".ts"))
    .sort()
    .map((entry) => path.join(componentRoot, entry));
  const dependencies = new Set<string>();
  const registryDependencies = new Set<string>(["index", "utils"]);

  const registryFiles = files.map((filePath) => {
    const content = readFileSync(filePath, "utf8");

    for (const specifier of readImportSpecifiers(content)) {
      if (specifier.startsWith("@bejamas/registry/lib/")) {
        registryDependencies.add(specifier.split("/").at(-1)!);
        continue;
      }

      if (specifier.startsWith("@bejamas/registry/ui/")) {
        registryDependencies.add(specifier.split("/")[3]!);
        continue;
      }

      if (specifier.startsWith(".")) {
        const resolved = resolveImportFile(filePath, specifier);

        if (!resolved) {
          continue;
        }

        if (resolved.startsWith(uiRoot)) {
          const dependencyName = path
            .relative(uiRoot, resolved)
            .split(path.sep)[0];
          if (dependencyName && dependencyName !== name) {
            registryDependencies.add(dependencyName);
          }
          continue;
        }

        if (resolved.startsWith(libRoot)) {
          registryDependencies.add(
            path.basename(resolved, path.extname(resolved)),
          );
          continue;
        }

        continue;
      }

      if (specifier.startsWith("astro")) {
        continue;
      }

      dependencies.add(specifier);
    }

    return {
      path: path
        .join("ui", name, path.basename(filePath))
        .replaceAll(path.sep, "/"),
      type: "registry:ui" as const,
      content: rewriteRegistryImports(content, styleId),
    };
  });

  return {
    $schema: schemaUrl,
    name,
    type: "registry:ui",
    files: registryFiles,
    dependencies: sortStrings(dependencies),
    registryDependencies: sortStrings(registryDependencies),
  };
}

function buildLibItem(name: string, styleId: string): RegistryItem {
  const filePath = path.join(libRoot, `${name}.ts`);
  const content = readFileSync(filePath, "utf8");
  const dependencies = new Set<string>();

  for (const specifier of readImportSpecifiers(content)) {
    if (
      specifier.startsWith("@bejamas/registry/") ||
      specifier.startsWith("astro")
    ) {
      continue;
    }

    if (!specifier.startsWith(".")) {
      dependencies.add(specifier);
    }
  }

  return {
    $schema: schemaUrl,
    name,
    type: "registry:lib",
    files: [
      {
        path: path.join("lib", `${name}.ts`).replaceAll(path.sep, "/"),
        type: "registry:lib",
        content: rewriteRegistryImports(content, styleId),
      },
    ],
    dependencies: sortStrings(dependencies),
  };
}

function buildStyleIndexItem(style: (typeof STYLES)[number]) {
  return {
    $schema: schemaUrl,
    name: "index",
    type: "registry:style",
    dependencies: ["class-variance-authority", "@lucide/astro"],
    devDependencies: ["shadcn", "tw-animate-css"],
    registryDependencies: ["utils"],
    css: buildRegistryStyleCss(style.name),
    cssVars: {},
    files: [],
    meta: {
      styleId: style.id,
    },
  };
}

function main() {
  const uiNames = getUiComponentNames();
  const libNames = getLibItemNames();

  rmSync(outputRoot, { recursive: true, force: true });
  mkdirSync(outputRoot, { recursive: true });

  writeJson(
    path.join(outputRoot, "index.json"),
    STYLES.map((style) => ({
      name: style.id,
      label: style.title,
    })),
  );

  for (const style of STYLES) {
    const styleOutputRoot = path.join(outputRoot, style.id);

    writeJson(
      path.join(styleOutputRoot, "index.json"),
      buildStyleIndexItem(style),
    );

    for (const name of libNames) {
      writeJson(
        path.join(styleOutputRoot, `${name}.json`),
        buildLibItem(name, style.id),
      );
    }

    for (const name of uiNames) {
      writeJson(
        path.join(styleOutputRoot, `${name}.json`),
        buildUiItem(name, style.id),
      );
    }
  }
}

main();
