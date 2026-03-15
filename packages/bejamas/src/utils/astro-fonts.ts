import path from "node:path";
import fg from "fast-glob";
import fs from "fs-extra";
import {
  fonts,
  getFontPackageName,
  getFontValue,
  type DesignSystemConfig,
} from "@bejamas/create-config/server";

const ASTRO_CONFIG_BLOCK_START = "// bejamas:astro-fonts:start";
const ASTRO_CONFIG_BLOCK_END = "// bejamas:astro-fonts:end";
const ASTRO_LAYOUT_BLOCK_START = "<!-- bejamas:astro-fonts:start -->";
const ASTRO_LAYOUT_BLOCK_END = "<!-- bejamas:astro-fonts:end -->";
const ASTRO_FONT_CONSTANT = "BEJAMAS_ASTRO_FONTS";

const ASTRO_CONFIG_CANDIDATES = [
  "astro.config.mjs",
  "apps/web/astro.config.mjs",
  "apps/docs/astro.config.mjs",
] as const;

const ASTRO_LAYOUT_CANDIDATES = [
  "src/layouts/Layout.astro",
  "apps/web/src/layouts/Layout.astro",
] as const;

const STARLIGHT_HEAD_RELATIVE_PATH = "apps/docs/src/components/Head.astro";

const ASTRO_FONT_PROVIDERS = ["fontsource", "google"] as const;
const ASTRO_FONTSOURCE_FONT_NAMES = new Set<DesignSystemConfig["font"]>([
  "geist",
  "geist-mono",
]);
const MANAGED_BODY_FONT_CLASSES = new Set(["font-mono", "font-serif"]);

type ManagedAstroFontProvider = (typeof ASTRO_FONT_PROVIDERS)[number];
type ManagedAstroFontSubsets = [string, ...string[]];

export type ManagedAstroFont = {
  cssVariable: string;
  name: string;
  provider: ManagedAstroFontProvider;
  subsets: ManagedAstroFontSubsets;
};

function compactSource(source: string) {
  return source.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function upsertImport(
  source: string,
  moduleName: string,
  importedName: string,
  fallbackNames: string[] = [],
) {
  const importPattern = new RegExp(
    `import\\s*\\{([^}]+)\\}\\s*from\\s*["']${escapeRegExp(moduleName)}["'];?`,
  );

  if (importPattern.test(source)) {
    return source.replace(importPattern, (_match, importsSource) => {
      const imports = importsSource
        .split(",")
        .map((value: string) => value.trim())
        .filter(Boolean);

      if (!imports.includes(importedName)) {
        imports.push(importedName);
      }

      for (const name of fallbackNames) {
        if (!imports.includes(name)) {
          imports.unshift(name);
        }
      }

      return `import { ${Array.from(new Set(imports)).join(", ")} } from "${moduleName}";`;
    });
  }

  const importLine = `import { ${Array.from(
    new Set([...fallbackNames, importedName]),
  ).join(", ")} } from "${moduleName}";`;

  const frontmatterEnd = source.indexOf("---", 3);
  if (source.startsWith("---") && frontmatterEnd !== -1) {
    return `${source.slice(0, frontmatterEnd).trimEnd()}\n${importLine}\n${source.slice(frontmatterEnd)}`;
  }

  return `${importLine}\n${source}`;
}

function buildAstroConfigFontBlock(fontsToSerialize: ManagedAstroFont[]) {
  const body =
    fontsToSerialize.length === 0
      ? ""
      : `\n${fontsToSerialize
          .map(
            (font) =>
              `  {\n    provider: fontProviders.${font.provider}(),\n    name: ${JSON.stringify(font.name)},\n    cssVariable: ${JSON.stringify(font.cssVariable)},\n    subsets: ${JSON.stringify(font.subsets)},\n  },`,
          )
          .join("\n")}\n`;

  return `${ASTRO_CONFIG_BLOCK_START}\n/** @type {NonNullable<import("astro/config").AstroUserConfig["fonts"]>} */\nconst ${ASTRO_FONT_CONSTANT} = [${body}];\n${ASTRO_CONFIG_BLOCK_END}`;
}

function buildAstroLayoutFontBlock(fontsToSerialize: ManagedAstroFont[]) {
  const body = fontsToSerialize
    .map((font) => `<Font cssVariable="${font.cssVariable}" />`)
    .join("\n");

  return `${ASTRO_LAYOUT_BLOCK_START}\n${body}\n${ASTRO_LAYOUT_BLOCK_END}`;
}

function bodyFontClassFromCssVariable(cssVariable?: string) {
  if (cssVariable === "--font-mono" || cssVariable === "--font-serif") {
    return fontClassFromCssVariable(cssVariable);
  }

  return "";
}

function upsertManagedBodyFontClass(source: string, cssVariable?: string) {
  const bodyClass = bodyFontClassFromCssVariable(cssVariable);
  const bodyTagPattern = /<body\b([^>]*?)(\/?)>/m;

  if (!bodyTagPattern.test(source)) {
    return source;
  }

  return source.replace(bodyTagPattern, (_match, attrs, selfClosing) => {
    const classPattern = /\sclass=(["'])(.*?)\1/m;
    const classMatch = attrs.match(classPattern);
    const quote = classMatch?.[1] ?? '"';
    const existingClasses = (classMatch?.[2] ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .filter((className) => !MANAGED_BODY_FONT_CLASSES.has(className));
    const nextClasses = bodyClass
      ? Array.from(new Set([...existingClasses, bodyClass]))
      : existingClasses;

    let nextAttrs = attrs.replace(classPattern, "");

    if (nextClasses.length > 0) {
      nextAttrs = `${nextAttrs} class=${quote}${nextClasses.join(" ")}${quote}`;
    }

    return `<body${nextAttrs}${selfClosing}>`;
  });
}

export function parseManagedAstroFonts(source: string) {
  const markerPattern = new RegExp(
    `${escapeRegExp(ASTRO_CONFIG_BLOCK_START)}[\\s\\S]*?const\\s+${ASTRO_FONT_CONSTANT}\\s*=\\s*\\[([\\s\\S]*?)\\];[\\s\\S]*?${escapeRegExp(ASTRO_CONFIG_BLOCK_END)}`,
  );
  const match = source.match(markerPattern);
  if (!match) {
    return [] as ManagedAstroFont[];
  }

  const objectMatches = match[1].match(/\{[\s\S]*?\}/g) ?? [];

  return objectMatches
    .map((entry) => {
      const name = entry.match(/name:\s*"([^"]+)"/)?.[1];
      const cssVariable = entry.match(/cssVariable:\s*"([^"]+)"/)?.[1];
      const provider = entry.match(/provider:\s*fontProviders\.([a-z]+)\(\)/)?.[1];
      const subsetsSource = entry.match(/subsets:\s*(\[[^\]]*\])/s)?.[1];

      if (
        !name ||
        !cssVariable ||
        !provider ||
        !ASTRO_FONT_PROVIDERS.includes(provider as ManagedAstroFontProvider)
      ) {
        return null;
      }

      let subsets: ManagedAstroFontSubsets = ["latin"];
      if (subsetsSource) {
        try {
          const parsed = JSON.parse(subsetsSource);
          if (
            Array.isArray(parsed) &&
            parsed.length > 0 &&
            parsed.every((value) => typeof value === "string")
          ) {
            subsets = parsed as ManagedAstroFontSubsets;
          }
        } catch {
          subsets = ["latin"];
        }
      }

      return {
        name,
        cssVariable,
        provider: provider as ManagedAstroFontProvider,
        subsets,
      };
    })
    .filter((value): value is ManagedAstroFont => value !== null);
}

function normalizeManagedAstroFontSubsets(
  subsets: string[] | undefined,
): ManagedAstroFontSubsets {
  if (!subsets?.length) {
    return ["latin"];
  }

  return [subsets[0], ...subsets.slice(1)];
}

function replaceManagedBlock(
  source: string,
  nextBlock: string,
  start: string,
  end: string,
) {
  const blockPattern = new RegExp(
    `${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`,
    "m",
  );

  if (blockPattern.test(source)) {
    return source.replace(blockPattern, nextBlock);
  }

  return null;
}

function stripExperimentalFontsProperty(source: string) {
  const experimentalMatch = source.match(/experimental\s*:\s*\{/);
  if (!experimentalMatch || experimentalMatch.index === undefined) {
    return source;
  }

  const propertyStart = experimentalMatch.index;
  const openingBraceIndex =
    propertyStart + experimentalMatch[0].lastIndexOf("{");

  let depth = 0;
  let closingBraceIndex = -1;
  let quote: '"' | "'" | "`" | null = null;

  for (let index = openingBraceIndex; index < source.length; index += 1) {
    const character = source[index];
    const previousCharacter = index > 0 ? source[index - 1] : "";

    if (quote) {
      if (character === quote && previousCharacter !== "\\") {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }

    if (character === "{") {
      depth += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        closingBraceIndex = index;
        break;
      }
    }
  }

  if (closingBraceIndex === -1) {
    return source;
  }

  const blockContent = source.slice(openingBraceIndex + 1, closingBraceIndex);
  const nextBlockContent = blockContent
    .replace(/(^|\n)\s*fonts\s*:\s*BEJAMAS_ASTRO_FONTS\s*,?\s*(?=\n|$)/g, "$1")
    .replace(/\n{3,}/g, "\n\n");

  let propertyEnd = closingBraceIndex + 1;
  while (propertyEnd < source.length && /\s/.test(source[propertyEnd])) {
    propertyEnd += 1;
  }
  if (source[propertyEnd] === ",") {
    propertyEnd += 1;
  }

  if (nextBlockContent.trim().length === 0) {
    return `${source.slice(0, propertyStart)}${source.slice(propertyEnd)}`;
  }

  const rebuiltProperty = `experimental: {${nextBlockContent}\n  }`;
  return `${source.slice(0, propertyStart)}${rebuiltProperty}${source.slice(closingBraceIndex + 1)}`;
}

export function patchAstroConfigSource(
  source: string,
  fontsToSerialize: ManagedAstroFont[],
  options: { starlightHeadOverride?: boolean } = {},
) {
  let next = upsertImport(source, "astro/config", "fontProviders", [
    "defineConfig",
  ]);

  const fontBlock = buildAstroConfigFontBlock(fontsToSerialize);
  const replacedBlock = replaceManagedBlock(
    next,
    fontBlock,
    ASTRO_CONFIG_BLOCK_START,
    ASTRO_CONFIG_BLOCK_END,
  );
  if (replacedBlock) {
    next = replacedBlock;
  } else {
    const imports = Array.from(next.matchAll(/^import .*$/gm));
    const lastImport = imports.at(-1);
    if (lastImport?.index !== undefined) {
      const insertAt = lastImport.index + lastImport[0].length;
      next = `${next.slice(0, insertAt)}\n\n${fontBlock}${next.slice(insertAt)}`;
    } else {
      next = `${fontBlock}\n\n${next}`;
    }
  }

  next = stripExperimentalFontsProperty(next);

  if (!/^\s*fonts:\s*BEJAMAS_ASTRO_FONTS\b/m.test(next)) {
    next = next.replace(
      /defineConfig\(\s*\{/,
      `defineConfig({\n  fonts: ${ASTRO_FONT_CONSTANT},`,
    );
  }

  if (options.starlightHeadOverride) {
    if (next.includes('Head: "./src/components/Head.astro"')) {
      return compactSource(next);
    }

    const starlightComponentsPattern =
      /starlight\(\{\s*([\s\S]*?)components:\s*\{([\s\S]*?)\}/m;

    if (starlightComponentsPattern.test(next)) {
      next = next.replace(
        starlightComponentsPattern,
        (_match, before, inner) =>
          `starlight({${before}components: {\n        Head: "./src/components/Head.astro",${inner ? `${inner}` : ""}\n      }`,
      );
    } else {
      next = next.replace(
        /starlight\(\s*\{/,
        `starlight({\n      components: {\n        Head: "./src/components/Head.astro",\n      },`,
      );
    }
  }

  return compactSource(next);
}

export function patchAstroLayoutSource(
  source: string,
  fontsToSerialize: ManagedAstroFont[],
  activeFontCssVariable?: string,
) {
  let next = upsertImport(source, "astro:assets", "Font");
  const fontBlock = buildAstroLayoutFontBlock(fontsToSerialize);
  const replacedBlock = replaceManagedBlock(
    next,
    fontBlock,
    ASTRO_LAYOUT_BLOCK_START,
    ASTRO_LAYOUT_BLOCK_END,
  );
  if (replacedBlock) {
    next = replacedBlock;
  } else if (next.includes("<head>")) {
    next = next.replace(
      "<head>",
      `<head>\n    ${fontBlock.replace(/\n/g, "\n    ")}`,
    );
  } else if (next.includes("</head>")) {
    next = next.replace(
      "</head>",
      `  ${fontBlock.replace(/\n/g, "\n  ")}\n</head>`,
    );
  } else {
    next = `${next}\n${fontBlock}\n`;
  }

  next = upsertManagedBodyFontClass(next, activeFontCssVariable);

  return compactSource(next);
}

export function patchStarlightHeadSource(
  source: string,
  fontsToSerialize: ManagedAstroFont[],
) {
  let next = upsertImport(
    source,
    "@astrojs/starlight/components/Head.astro",
    "DefaultHead",
  );
  next = upsertImport(next, "astro:assets", "Font");

  const fontBlock = buildAstroLayoutFontBlock(fontsToSerialize);
  const replacedBlock = replaceManagedBlock(
    next,
    fontBlock,
    ASTRO_LAYOUT_BLOCK_START,
    ASTRO_LAYOUT_BLOCK_END,
  );
  if (replacedBlock) {
    next = replacedBlock;
  } else if (next.includes("<DefaultHead")) {
    next = next.replace(
      /<DefaultHead[^>]*\/>/,
      (match) => `${match}\n${fontBlock}`,
    );
  } else {
    next = `${next.trimEnd()}\n\n<DefaultHead />\n${fontBlock}\n`;
  }

  return compactSource(next);
}

export function toManagedAstroFont(
  fontName: DesignSystemConfig["font"],
): ManagedAstroFont | null {
  const font = getFontValue(fontName);
  if (
    !font ||
    font.type !== "registry:font" ||
    !ASTRO_FONT_PROVIDERS.includes(
      font.font.provider as ManagedAstroFontProvider,
    )
  ) {
    return null;
  }

  return {
    name: font.title ?? font.font.import.replace(/_/g, " "),
    cssVariable: font.font.variable,
    provider: ASTRO_FONTSOURCE_FONT_NAMES.has(fontName)
      ? "fontsource"
      : "google",
    subsets: normalizeManagedAstroFontSubsets(font.font.subsets),
  };
}

export function mergeManagedAstroFonts(
  currentFonts: ManagedAstroFont[],
  nextFont: ManagedAstroFont,
) {
  const withoutSameSlot = currentFonts.filter(
    (font) => font.cssVariable !== nextFont.cssVariable,
  );

  return [...withoutSameSlot, nextFont].sort((left, right) =>
    left.cssVariable.localeCompare(right.cssVariable),
  );
}

export function fontClassFromCssVariable(cssVariable: string) {
  const suffix = cssVariable.replace(/^--font-/, "");
  return `font-${suffix}`;
}

async function patchFileIfExists(
  filePath: string,
  transformer: (source: string) => string,
) {
  if (!(await fs.pathExists(filePath))) {
    return;
  }

  const current = await fs.readFile(filePath, "utf8");
  const next = transformer(current);
  if (next !== current) {
    await fs.writeFile(filePath, next, "utf8");
  }
}

async function collectPackageJsonsFromComponents(projectPath: string) {
  const componentJsonFiles = await fg("**/components.json", {
    cwd: projectPath,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.astro/**"],
  });

  const packageJsonFiles = new Set<string>();

  for (const relativePath of componentJsonFiles) {
    const absolutePath = path.resolve(projectPath, relativePath);
    const current = await fs.readJson(absolutePath);
    const cssPath = current?.tailwind?.css;
    if (typeof cssPath !== "string" || cssPath.length === 0) {
      continue;
    }

    let currentDir = path.dirname(
      path.resolve(path.dirname(absolutePath), cssPath),
    );
    while (true) {
      const packageJsonPath = path.resolve(currentDir, "package.json");
      if (await fs.pathExists(packageJsonPath)) {
        packageJsonFiles.add(packageJsonPath);
        break;
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }
  }

  return packageJsonFiles;
}

async function upsertStarlightHeadFile(
  projectPath: string,
  fontsToSerialize: ManagedAstroFont[],
) {
  const headPath = path.resolve(projectPath, STARLIGHT_HEAD_RELATIVE_PATH);
  const next = patchStarlightHeadSource(
    (await fs.pathExists(headPath))
      ? await fs.readFile(headPath, "utf8")
      : '---\nimport DefaultHead from "@astrojs/starlight/components/Head.astro";\nimport { Font } from "astro:assets";\n---\n\n<DefaultHead />\n',
    fontsToSerialize,
  );

  await fs.ensureDir(path.dirname(headPath));
  await fs.writeFile(headPath, next, "utf8");
}

export async function readManagedAstroFontsFromProject(projectPath: string) {
  for (const relativePath of ASTRO_CONFIG_CANDIDATES) {
    const absolutePath = path.resolve(projectPath, relativePath);
    if (!(await fs.pathExists(absolutePath))) {
      continue;
    }

    const source = await fs.readFile(absolutePath, "utf8");
    const parsed = parseManagedAstroFonts(source);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  return [] as ManagedAstroFont[];
}

export async function cleanupAstroFontPackages(projectPath: string) {
  const managedPackages = new Set(
    fonts
      .filter((font) => font.type === "registry:font")
      .map((font) =>
        getFontPackageName(
          font.name.replace(/^font-/, "") as DesignSystemConfig["font"],
        ),
      ),
  );

  const packageJsonFiles = await collectPackageJsonsFromComponents(projectPath);

  await Promise.all(
    Array.from(packageJsonFiles).map(async (absolutePath) => {
      const current = await fs.readJson(absolutePath);
      let changed = false;

      for (const bucket of ["dependencies", "devDependencies"] as const) {
        const currentBucket = current[bucket];
        if (!currentBucket || typeof currentBucket !== "object") {
          continue;
        }

        for (const packageName of managedPackages) {
          if (packageName in currentBucket) {
            delete currentBucket[packageName];
            changed = true;
          }
        }

        if (Object.keys(currentBucket).length === 0) {
          delete current[bucket];
          changed = true;
        }
      }

      if (changed) {
        await fs.writeJson(absolutePath, current, { spaces: 2 });
      }
    }),
  );
}

export async function syncAstroFontsInProject(
  projectPath: string,
  fontsToSerialize: ManagedAstroFont[],
  activeFontCssVariable?: string,
) {
  await Promise.all(
    ASTRO_CONFIG_CANDIDATES.map((relativePath) =>
      patchFileIfExists(path.resolve(projectPath, relativePath), (source) =>
        patchAstroConfigSource(source, fontsToSerialize, {
          starlightHeadOverride: relativePath === "apps/docs/astro.config.mjs",
        }),
      ),
    ),
  );

  await Promise.all(
    ASTRO_LAYOUT_CANDIDATES.map((relativePath) =>
      patchFileIfExists(path.resolve(projectPath, relativePath), (source) =>
        patchAstroLayoutSource(
          source,
          fontsToSerialize,
          activeFontCssVariable,
        ),
      ),
    ),
  );

  const docsConfigPath = path.resolve(
    projectPath,
    "apps/docs/astro.config.mjs",
  );
  if (await fs.pathExists(docsConfigPath)) {
    await upsertStarlightHeadFile(projectPath, fontsToSerialize);
  }
}
