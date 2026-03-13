import path from "node:path";
import fs from "fs-extra";
import fg from "fast-glob";
import {
  buildRegistryTheme,
  getDocumentDirection,
  getDocumentLanguage,
  getFontPackageName,
  getFontValue,
  getStyleId,
  type DesignSystemConfig,
} from "@bejamas/create-config/server";

const CREATE_BLOCK_START = "/* bejamas:create:start */";
const CREATE_BLOCK_END = "/* bejamas:create:end */";

type ThemeVars = ReturnType<typeof buildRegistryTheme>["cssVars"];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compactCss(source: string) {
  return source.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function stripLegacyCreateBlock(source: string) {
  const fullBlockPattern = new RegExp(
    `\\n*${escapeRegExp(CREATE_BLOCK_START)}[\\s\\S]*?${escapeRegExp(CREATE_BLOCK_END)}\\n*`,
    "m",
  );
  const danglingBlockPattern = new RegExp(
    `\\n*${escapeRegExp(CREATE_BLOCK_START)}[\\s\\S]*$`,
    "m",
  );

  return compactCss(
    source.replace(fullBlockPattern, "\n\n").replace(danglingBlockPattern, "\n\n"),
  );
}

function buildCssVarBlock(selector: string, vars: Record<string, string>) {
  return [
    `${selector} {`,
    ...Object.entries(vars).map(([key, value]) => `  --${key}: ${value};`),
    "}",
  ].join("\n");
}

function replaceTopLevelBlock(source: string, selector: string, nextBlock: string) {
  const pattern = new RegExp(
    `^${escapeRegExp(selector)}\\s*\\{[\\s\\S]*?^\\}`,
    "m",
  );

  if (pattern.test(source)) {
    return source.replace(pattern, nextBlock);
  }

  const layerIndex = source.indexOf("@layer base");
  if (layerIndex !== -1) {
    return `${source.slice(0, layerIndex).trimEnd()}\n\n${nextBlock}\n\n${source
      .slice(layerIndex)
      .trimStart()}`;
  }

  return `${source.trimEnd()}\n\n${nextBlock}\n`;
}

function upsertImports(source: string, imports: string[]) {
  const lines = source.split("\n");
  const cleanedLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (trimmed === '@import "shadcn/tailwind.css";') {
      return false;
    }

    return !trimmed.startsWith('@import "@fontsource-variable/');
  });

  let insertAt = -1;
  for (let index = 0; index < cleanedLines.length; index += 1) {
    if (cleanedLines[index].trim().startsWith("@import ")) {
      insertAt = index;
      continue;
    }

    if (insertAt !== -1 && cleanedLines[index].trim() !== "") {
      break;
    }
  }

  const uniqueImports = imports.filter(
    (line, index) => imports.indexOf(line) === index,
  );

  if (insertAt === -1) {
    return compactCss([...uniqueImports, "", ...cleanedLines].join("\n"));
  }

  cleanedLines.splice(insertAt + 1, 0, ...uniqueImports);
  return compactCss(cleanedLines.join("\n"));
}

function upsertThemeInlineFont(
  source: string,
  fontVariable: string,
  fontFamily: string,
) {
  const fontDeclaration = `  ${fontVariable}: ${fontFamily};`;
  const pattern = /@theme inline\s*\{[\s\S]*?\n\}/m;

  if (!pattern.test(source)) {
    const block = `@theme inline {\n${fontDeclaration}\n}`;
    const customVariantIndex = source.indexOf("@custom-variant");

    if (customVariantIndex !== -1) {
      const nextLineIndex = source.indexOf("\n", customVariantIndex);
      return `${source.slice(0, nextLineIndex + 1).trimEnd()}\n\n${block}\n\n${source
        .slice(nextLineIndex + 1)
        .trimStart()}`;
    }

    return `${block}\n\n${source.trimStart()}`;
  }

  return source.replace(pattern, (block) => {
    const withoutManagedFonts = block
      .replace(/\n\s*--font-(sans|serif|mono):[^\n]+/g, "")
      .replace(/@theme inline\s*\{\n?/, "@theme inline {\n");

    return withoutManagedFonts.replace(
      "@theme inline {\n",
      `@theme inline {\n${fontDeclaration}\n`,
    );
  });
}

function upsertBaseLayerHtmlFont(source: string, fontClass: string) {
  const pattern = /@layer base\s*\{[\s\S]*?\n\}/m;

  if (!pattern.test(source)) {
    return `${source.trimEnd()}\n\n@layer base {\n  html {\n    @apply ${fontClass};\n  }\n}\n`;
  }

  return source.replace(pattern, (block) => {
    const htmlRulePattern = /\n\s*html\s*\{[\s\S]*?\n\s*\}/m;
    const cleanedBlock = block.replace(htmlRulePattern, "");
    return cleanedBlock.replace(
      /\n\}$/,
      `\n  html {\n    @apply ${fontClass};\n  }\n}`,
    );
  });
}

export function transformDesignSystemCss(
  source: string,
  config: DesignSystemConfig,
  themeVars?: ThemeVars,
) {
  const effectiveThemeVars = themeVars ?? buildRegistryTheme(config).cssVars;
  const rootVars = {
    ...Object.fromEntries(
      Object.entries(effectiveThemeVars.theme ?? {}).filter(
        ([key]) => key !== "bejamas-font-family",
      ),
    ),
    ...(effectiveThemeVars.light ?? {}),
  };
  const darkVars = {
    ...(effectiveThemeVars.dark ?? {}),
  };
  const font = getFontValue(config.font);
  let next = stripLegacyCreateBlock(source);

  next = upsertImports(next, [
    '@import "shadcn/tailwind.css";',
    `@import "${getFontPackageName(config.font)}";`,
  ]);
  next = replaceTopLevelBlock(next, ":root", buildCssVarBlock(":root", rootVars));
  next = replaceTopLevelBlock(next, ".dark", buildCssVarBlock(".dark", darkVars));

  if (font) {
    next = upsertThemeInlineFont(next, font.font.variable, font.font.family);
    next = upsertBaseLayerHtmlFont(
      next,
      font.font.variable.replace("--", ""),
    );
  }

  return compactCss(next);
}

async function patchComponentsJson(
  filepath: string,
  config: DesignSystemConfig,
) {
  const current = await fs.readJson(filepath);
  const next = {
    ...current,
    style: getStyleId(config.style),
    iconLibrary: config.iconLibrary,
    rtl: config.rtl,
    tailwind: {
      ...(current.tailwind ?? {}),
      baseColor: config.baseColor,
      cssVariables: true,
    },
  };

  await fs.writeJson(filepath, next, { spaces: 2 });
}

async function patchCssFileWithTheme(
  filepath: string,
  config: DesignSystemConfig,
  themeVars?: ThemeVars,
) {
  const current = await fs.readFile(filepath, "utf8");
  const next = transformDesignSystemCss(current, config, themeVars);
  await fs.writeFile(filepath, next, "utf8");
}

async function patchPackageJsonDependency(
  filepath: string,
  config: DesignSystemConfig,
) {
  if (!(await fs.pathExists(filepath))) {
    return;
  }

  const current = await fs.readJson(filepath);
  const dependencyName = getFontPackageName(config.font);
  const next = {
    ...current,
    dependencies: {
      ...(current.dependencies ?? {}),
      [dependencyName]:
        current.dependencies?.[dependencyName] ??
        current.devDependencies?.[dependencyName] ??
        "latest",
    },
  };

  await fs.writeJson(filepath, next, { spaces: 2 });
}

async function patchTemplateI18nFile(
  filepath: string,
  config: DesignSystemConfig,
) {
  if (!(await fs.pathExists(filepath))) {
    return;
  }

  const current = await fs.readFile(filepath, "utf8");
  const nextLanguage = getDocumentLanguage(config);
  const next = current.replace(
    /export const CURRENT_LANGUAGE: TemplateLanguage = "[^"]+";/,
    `export const CURRENT_LANGUAGE: TemplateLanguage = "${nextLanguage}";`,
  );

  if (next !== current) {
    await fs.writeFile(filepath, next, "utf8");
  }
}

async function patchLayoutFile(filepath: string, config: DesignSystemConfig) {
  if (!(await fs.pathExists(filepath))) {
    return;
  }

  const current = await fs.readFile(filepath, "utf8");
  if (current.includes('from "@/i18n/ui"')) {
    return;
  }

  const nextLanguage = getDocumentLanguage(config);
  const nextDirection = getDocumentDirection(config);
  let next = current
    .replace(/<html([^>]*?)lang="[^"]*"([^>]*)>/, "<html$1$2>")
    .replace(/<html([^>]*?)dir="[^"]*"([^>]*)>/, "<html$1$2>");

  next = next.replace(
    /<html([^>]*)>/,
    `<html$1 lang="${nextLanguage}"${config.rtl ? ` dir="${nextDirection}"` : ""}>`,
  );

  if (next !== current) {
    await fs.writeFile(filepath, next, "utf8");
  }
}

export async function applyDesignSystemToProject(
  projectPath: string,
  config: DesignSystemConfig,
  options: {
    themeVars?: ThemeVars;
  } = {},
) {
  const componentJsonFiles = await fg("**/components.json", {
    cwd: projectPath,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.astro/**"],
  });

  const cssFiles = new Set<string>();
  const packageJsonFiles = new Set<string>();

  for (const relativePath of componentJsonFiles) {
    const absolutePath = path.resolve(projectPath, relativePath);
    await patchComponentsJson(absolutePath, config);

    const json = await fs.readJson(absolutePath);
    const cssPath = json?.tailwind?.css;
    if (typeof cssPath === "string" && cssPath.length > 0) {
      const absoluteCssPath = path.resolve(path.dirname(absolutePath), cssPath);
      cssFiles.add(absoluteCssPath);

      let currentDir = path.dirname(absoluteCssPath);
      while (currentDir.startsWith(projectPath)) {
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
  }

  await Promise.all(
    Array.from(cssFiles).map((filepath) =>
      patchCssFileWithTheme(filepath, config, options.themeVars),
    ),
  );
  await Promise.all(
    Array.from(packageJsonFiles).map((filepath) =>
      patchPackageJsonDependency(filepath, config),
    ),
  );
  await Promise.all(
    [
      path.resolve(projectPath, "src/i18n/ui.ts"),
      path.resolve(projectPath, "apps/web/src/i18n/ui.ts"),
    ].map((filepath) => patchTemplateI18nFile(filepath, config)),
  );

  await Promise.all(
    [
      path.resolve(projectPath, "src/layouts/Layout.astro"),
      path.resolve(projectPath, "apps/web/src/layouts/Layout.astro"),
      path.resolve(projectPath, "apps/docs/src/layouts/Layout.astro"),
    ].map((filepath) => patchLayoutFile(filepath, config)),
  );
}
