import path from "node:path";
import fs from "fs-extra";
import fg from "fast-glob";
import {
  buildThemeCss,
  getDocumentDirection,
  getDocumentLanguage,
  getFontPackageName,
  getGlobalStyleCss,
  getStyleId,
  type DesignSystemConfig,
} from "@bejamas/create-config/server";

const CREATE_BLOCK_START = "/* bejamas:create:start */";
const CREATE_BLOCK_END = "/* bejamas:create:end */";

function replaceCreateBlock(source: string, nextBlock: string) {
  const block = `${CREATE_BLOCK_START}\n${nextBlock.trim()}\n${CREATE_BLOCK_END}`;
  const pattern = new RegExp(
    `${CREATE_BLOCK_START}[\\s\\S]*?${CREATE_BLOCK_END}`,
    "m",
  );

  if (pattern.test(source)) {
    return source.replace(pattern, block);
  }

  return `${source.trimEnd()}\n\n${block}\n`;
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

async function patchCssFile(filepath: string, config: DesignSystemConfig) {
  return patchCssFileWithTheme(filepath, config);
}

async function patchCssFileWithTheme(
  filepath: string,
  config: DesignSystemConfig,
  themeCss = buildThemeCss(config),
) {
  const current = await fs.readFile(filepath, "utf8");
  const fontImport = `@import "${getFontPackageName(config.font)}";`;
  const nextBlock = `${fontImport}\n\n${themeCss}\n\n${getGlobalStyleCss(config.style)}`;
  const next = replaceCreateBlock(current, nextBlock);
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
    themeCss?: string;
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
      patchCssFileWithTheme(filepath, config, options.themeCss),
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
