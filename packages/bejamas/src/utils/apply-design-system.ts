import path from "node:path";
import fs from "fs-extra";
import fg from "fast-glob";
import {
  buildRegistryTheme,
  getDocumentDirection,
  getDocumentLanguage,
  getFontValue,
  getStyleId,
  ICON_LIBRARIES,
  type DesignSystemConfig,
} from "@bejamas/create-config/server";
import {
  cleanupAstroFontPackages,
  fontClassFromCssVariable,
  syncAstroFontsInProject,
  toManagedAstroFont,
} from "@/src/utils/astro-fonts";
import { BEJAMAS_COMPONENTS_SCHEMA_URL } from "@/src/schema";

const CREATE_BLOCK_START = "/* bejamas:create:start */";
const CREATE_BLOCK_END = "/* bejamas:create:end */";
const SHADCN_TAILWIND_IMPORT = '@import "shadcn/tailwind.css";';
const BEJAMAS_TAILWIND_IMPORT = '@import "bejamas/tailwind.css";';
const MANAGED_TAILWIND_IMPORTS = new Set([
  SHADCN_TAILWIND_IMPORT,
  BEJAMAS_TAILWIND_IMPORT,
]);
const MANAGED_ICON_PACKAGES = new Set(
  ICON_LIBRARIES.map((library) => library.packageName),
);
const FALLBACK_ICON_PACKAGE_VERSION = "latest";
const TEMPLATE_APP_UI_IMPORT = 'import { appUi } from "@/i18n/ui";';

type TemplateI18nVariant = "astro" | "monorepo";

type ThemeVars = ReturnType<typeof buildRegistryTheme>["cssVars"];

const TEMPLATE_I18N_SOURCES: Record<TemplateI18nVariant, string> = {
  astro: `const RTL_LANGUAGES = ["ar", "fa", "he"] as const;

export type TemplateLanguage = "en" | (typeof RTL_LANGUAGES)[number];

export const CURRENT_LANGUAGE: TemplateLanguage = "en";

const ui = {
  en: {
    metadataTitle: "bejamas/ui Astro project",
    welcomeMessage: "Welcome to {project} Astro project.",
    getStartedMessage: "Get started by editing src/pages/index.astro.",
    readDocs: "Read docs",
    getCustomDemo: "Get custom demo",
  },
  ar: {
    metadataTitle: "مشروع Astro من bejamas/ui",
    welcomeMessage: "مرحبًا بك في مشروع Astro الخاص بـ {project}.",
    getStartedMessage: "ابدأ بتحرير src/pages/index.astro.",
    readDocs: "اقرأ التوثيق",
    getCustomDemo: "احصل على عرض توضيحي مخصص",
  },
  fa: {
    metadataTitle: "پروژه Astro با bejamas/ui",
    welcomeMessage: "به پروژه Astro با {project} خوش آمدید.",
    getStartedMessage: "برای شروع src/pages/index.astro را ویرایش کنید.",
    readDocs: "مطالعه مستندات",
    getCustomDemo: "درخواست دموی سفارشی",
  },
  he: {
    metadataTitle: "פרויקט Astro עם bejamas/ui",
    welcomeMessage: "ברוכים הבאים לפרויקט Astro של {project}.",
    getStartedMessage: "התחילו בעריכת src/pages/index.astro.",
    readDocs: "קריאת התיעוד",
    getCustomDemo: "קבלת דמו מותאם",
  },
} as const satisfies Record<TemplateLanguage, Record<string, string>>;

export const appUi = {
  lang: CURRENT_LANGUAGE,
  dir: RTL_LANGUAGES.includes(
    CURRENT_LANGUAGE as (typeof RTL_LANGUAGES)[number],
  )
    ? "rtl"
    : "ltr",
  ...ui[CURRENT_LANGUAGE],
};
`,
  monorepo: `const RTL_LANGUAGES = ["ar", "fa", "he"] as const;

export type TemplateLanguage = "en" | (typeof RTL_LANGUAGES)[number];

export const CURRENT_LANGUAGE: TemplateLanguage = "en";

const ui = {
  en: {
    metadataTitle: "bejamas/ui Astro project",
    welcomeMessage: "Welcome to {project} Astro monorepo.",
    getStartedMessage: "Get started by editing apps/web/src/pages/index.astro.",
    readDocs: "Read docs",
    getCustomDemo: "Get custom demo",
  },
  ar: {
    metadataTitle: "مشروع Astro من bejamas/ui",
    welcomeMessage: "مرحبًا بك في مشروع Astro الأحادي من {project}.",
    getStartedMessage: "ابدأ بتحرير apps/web/src/pages/index.astro.",
    readDocs: "اقرأ التوثيق",
    getCustomDemo: "احصل على عرض توضيحي مخصص",
  },
  fa: {
    metadataTitle: "پروژه Astro با bejamas/ui",
    welcomeMessage: "به مونوریپوی Astro با {project} خوش آمدید.",
    getStartedMessage:
      "برای شروع apps/web/src/pages/index.astro را ویرایش کنید.",
    readDocs: "مطالعه مستندات",
    getCustomDemo: "درخواست دموی سفارشی",
  },
  he: {
    metadataTitle: "פרויקט Astro עם bejamas/ui",
    welcomeMessage: "ברוכים הבאים למונורפו Astro של {project}.",
    getStartedMessage: "התחילו בעריכת apps/web/src/pages/index.astro.",
    readDocs: "קריאת התיעוד",
    getCustomDemo: "קבלת דמו מותאם",
  },
} as const satisfies Record<TemplateLanguage, Record<string, string>>;

export const appUi = {
  lang: CURRENT_LANGUAGE,
  dir: RTL_LANGUAGES.includes(
    CURRENT_LANGUAGE as (typeof RTL_LANGUAGES)[number],
  )
    ? "rtl"
    : "ltr",
  ...ui[CURRENT_LANGUAGE],
};
`,
};

const TEMPLATE_PAGE_VARIANTS = [
  {
    matchers: [
      'import { Button } from "@/ui/button";',
      "Astro project.",
      "Get started by editing src/pages/index.astro.",
    ],
    i18nSource: `---
import Layout from "@/layouts/Layout.astro";
import { appUi } from "@/i18n/ui";
import { Button } from "@/ui/button";

const [welcomePrefix, welcomeSuffix = ""] =
  appUi.welcomeMessage.split("{project}");
---

<Layout>
  <div
    class="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20"
  >
    <div class="flex flex-col gap-6 row-start-2 items-center sm:items-start">
      <img src="/bejamas.svg" alt="bejamas/ui" class="w-8 dark:invert" />
      <div class="space-y-2">
        <p class="text-sm">
          {welcomePrefix}<code
            class="font-bold relative bg-muted rounded p-1"
            >@bejamas/ui</code
          >{welcomeSuffix}
        </p>
        <p class="text-sm">
          {appUi.getStartedMessage}
        </p>
      </div>
      <div class="flex gap-2">
        <Button as="a" href="https://ui.bejamas.com/docs"
          >{appUi.readDocs}</Button
        >
        <Button as="a" href="https://bejamas.com/get-in-touch" variant="outline"
          >{appUi.getCustomDemo}</Button
        >
      </div>
    </div>
  </div>
</Layout>
`,
  },
  {
    matchers: [
      'import { Button } from "@repo/ui/components/button";',
      'width="32"',
      "Astro monorepo.",
      "Get started by editing apps/web/src/pages/index.astro.",
    ],
    i18nSource: `---
import Layout from "@/layouts/Layout.astro";
import { appUi } from "@/i18n/ui";
import { Button } from "@repo/ui/components/button";

const [welcomePrefix, welcomeSuffix = ""] =
  appUi.welcomeMessage.split("{project}");
---

<Layout>
  <div
    class="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20"
  >
    <div class="flex flex-col gap-6 row-start-2 items-center sm:items-start">
      <img
        src="/bejamas.svg"
        alt="bejamas/ui"
        class="w-8 dark:invert"
        width="32"
        height="32"
        alt="bejamas/ui logo"
      />
      <div class="space-y-2">
        <p class="text-sm">
          {welcomePrefix}<code
            class="font-bold relative bg-muted rounded p-1"
            >@bejamas/ui</code
          >{welcomeSuffix}
        </p>
        <p class="text-sm">
          {appUi.getStartedMessage}
        </p>
      </div>
      <div class="flex gap-2">
        <Button as="a" href="https://ui.bejamas.com/docs"
          >{appUi.readDocs}</Button
        >
        <Button as="a" href="https://bejamas.com/get-in-touch" variant="outline"
          >{appUi.getCustomDemo}</Button
        >
      </div>
    </div>
  </div>
</Layout>
`,
  },
  {
    matchers: [
      'import { Button } from "@repo/ui/components/button";',
      '<img src="/bejamas.svg" alt="bejamas/ui" class="w-8 dark:invert" />',
      "Astro monorepo.",
      "Get started by editing apps/web/src/pages/index.astro.",
    ],
    i18nSource: `---
import Layout from "@/layouts/Layout.astro";
import { appUi } from "@/i18n/ui";
import { Button } from "@repo/ui/components/button";

const [welcomePrefix, welcomeSuffix = ""] =
  appUi.welcomeMessage.split("{project}");
---

<Layout>
  <div
    class="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20"
  >
    <div class="flex flex-col gap-6 row-start-2 items-center sm:items-start">
      <img src="/bejamas.svg" alt="bejamas/ui" class="w-8 dark:invert" />
      <div class="space-y-2">
        <p class="text-sm">
          {welcomePrefix}<code
            class="font-bold relative bg-muted rounded p-1"
            >@bejamas/ui</code
          >{welcomeSuffix}
        </p>
        <p class="text-sm">
          {appUi.getStartedMessage}
        </p>
      </div>
      <div class="flex gap-2">
        <Button as="a" href="https://ui.bejamas.com/docs"
          >{appUi.readDocs}</Button
        >
        <Button as="a" href="https://bejamas.com/get-in-touch" variant="outline"
          >{appUi.getCustomDemo}</Button
        >
      </div>
    </div>
  </div>
</Layout>
`,
  },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compactCss(source: string) {
  return source.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function compactSource(source: string) {
  return (
    source
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
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
    source
      .replace(fullBlockPattern, "\n\n")
      .replace(danglingBlockPattern, "\n\n"),
  );
}

function buildCssVarBlock(selector: string, vars: Record<string, string>) {
  return [
    `${selector} {`,
    ...Object.entries(vars).map(([key, value]) => `  --${key}: ${value};`),
    "}",
  ].join("\n");
}

function replaceTopLevelBlock(
  source: string,
  selector: string,
  nextBlock: string,
) {
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
    if (MANAGED_TAILWIND_IMPORTS.has(trimmed)) {
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

function upsertManagedTailwindImport(source: string) {
  const nextImport = resolveManagedTailwindImport(source);
  const lines = source.split("\n");
  const cleanedLines = lines.filter(
    (line) => !MANAGED_TAILWIND_IMPORTS.has(line.trim()),
  );

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

  if (insertAt === -1) {
    return compactCss([nextImport, "", ...cleanedLines].join("\n"));
  }

  cleanedLines.splice(insertAt + 1, 0, nextImport);
  return compactCss(cleanedLines.join("\n"));
}

function resolveManagedTailwindImport(source: string) {
  if (source.includes(SHADCN_TAILWIND_IMPORT)) {
    return SHADCN_TAILWIND_IMPORT;
  }

  if (source.includes(BEJAMAS_TAILWIND_IMPORT)) {
    return BEJAMAS_TAILWIND_IMPORT;
  }

  return BEJAMAS_TAILWIND_IMPORT;
}

function normalizeSourceForComparison(source: string) {
  return source.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function upsertFrontmatterImport(source: string, importLine: string) {
  if (source.includes(importLine)) {
    return source;
  }

  const frontmatterEnd = source.indexOf("\n---", 3);
  if (source.startsWith("---\n") && frontmatterEnd !== -1) {
    return `${source.slice(0, frontmatterEnd).trimEnd()}\n${importLine}${source.slice(frontmatterEnd)}`;
  }

  return `${importLine}\n${source}`;
}

function getTemplateI18nVariant(filepath: string): TemplateI18nVariant {
  return filepath.includes(`${path.sep}apps${path.sep}web${path.sep}`)
    ? "monorepo"
    : "astro";
}

function buildTemplateI18nSource(
  variant: TemplateI18nVariant,
  language: string,
) {
  return compactSource(
    TEMPLATE_I18N_SOURCES[variant].replace(
      'export const CURRENT_LANGUAGE: TemplateLanguage = "en";',
      `export const CURRENT_LANGUAGE: TemplateLanguage = "${language}";`,
    ),
  );
}

function transformTemplateLayoutToI18n(source: string) {
  if (source.includes(TEMPLATE_APP_UI_IMPORT)) {
    return source;
  }

  let next = upsertFrontmatterImport(source, TEMPLATE_APP_UI_IMPORT);
  next = next
    .replace(/<html([^>]*?)\slang=(\"[^\"]*\"|\{[^}]+\})([^>]*)>/, "<html$1$3>")
    .replace(/<html([^>]*?)\sdir=(\"[^\"]*\"|\{[^}]+\})([^>]*)>/, "<html$1$3>");
  next = next.replace(
    /<html([^>]*)>/,
    "<html$1 lang={appUi.lang} dir={appUi.dir}>",
  );
  next = next.replace(
    /<title>[\s\S]*?<\/title>/,
    "<title>{appUi.metadataTitle}</title>",
  );

  return compactSource(next);
}

function transformStarterPageToI18n(source: string) {
  if (source.includes(TEMPLATE_APP_UI_IMPORT)) {
    return source;
  }

  const normalized = normalizeSourceForComparison(source);
  const match = TEMPLATE_PAGE_VARIANTS.find((variant) =>
    variant.matchers.every((matcher) =>
      normalized.includes(normalizeSourceForComparison(matcher)),
    ),
  );

  if (!match) {
    return source;
  }

  return compactSource(match.i18nSource);
}

function upsertThemeInlineFont(source: string, fontVariable?: string) {
  const pattern = /@theme inline\s*\{[\s\S]*?\n\}/m;

  if (!pattern.test(source)) {
    const declarations = [
      fontVariable ? `  ${fontVariable}: var(${fontVariable});` : null,
      "  --font-heading: var(--font-heading);",
    ]
      .filter(Boolean)
      .join("\n");
    const block = `@theme inline {\n${declarations}\n}`;
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
      .replace(/\n\s*--font-(sans|serif|mono|heading):[^\n]+/g, "")
      .replace(/\n\s*--bejamas-font-family:[^\n]+/g, "")
      .replace(/@theme inline\s*\{\n?/, "@theme inline {\n");
    const declarations = [
      fontVariable ? `  ${fontVariable}: var(${fontVariable});` : null,
      "  --font-heading: var(--font-heading);",
    ]
      .filter(Boolean)
      .join("\n");

    return withoutManagedFonts.replace(
      "@theme inline {\n",
      `@theme inline {\n${declarations}\n`,
    );
  });
}

function upsertBaseLayerHtmlFont(source: string, fontClass: string) {
  const pattern = /@layer base\s*\{[\s\S]*?\n\}/m;

  if (!pattern.test(source)) {
    return `${source.trimEnd()}\n\n@layer base {\n  .cn-font-heading {\n    @apply font-heading;\n  }\n  html {\n    @apply ${fontClass};\n  }\n}\n`;
  }

  return source.replace(pattern, (block) => {
    const htmlRulePattern = /\n\s*html\s*\{[\s\S]*?\n\s*\}/m;
    const headingRulePattern = /\n\s*\.cn-font-heading\s*\{[\s\S]*?\n\s*\}/m;
    const cleanedBlock = block
      .replace(htmlRulePattern, "")
      .replace(headingRulePattern, "");
    return cleanedBlock.replace(
      /\n\}$/,
      `\n  .cn-font-heading {\n    @apply font-heading;\n  }\n  html {\n    @apply ${fontClass};\n  }\n}`,
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
  const tailwindImport = resolveManagedTailwindImport(source);
  let next = stripLegacyCreateBlock(source);

  next = upsertImports(next, [tailwindImport]);
  next = replaceTopLevelBlock(
    next,
    ":root",
    buildCssVarBlock(":root", rootVars),
  );
  next = replaceTopLevelBlock(
    next,
    ".dark",
    buildCssVarBlock(".dark", darkVars),
  );
  next = upsertThemeInlineFont(next, font?.font.variable);

  if (font) {
    next = upsertBaseLayerHtmlFont(
      next,
      fontClassFromCssVariable(font.font.variable),
    );
  }

  return compactCss(next);
}

export function transformAstroManagedFontCss(
  source: string,
  fontVariable?: string,
) {
  const tailwindImport = resolveManagedTailwindImport(source);
  let next = stripLegacyCreateBlock(source);

  next = upsertImports(next, [tailwindImport]);
  next = upsertThemeInlineFont(next, fontVariable);

  if (fontVariable) {
    next = upsertBaseLayerHtmlFont(
      next,
      fontClassFromCssVariable(fontVariable),
    );
  }

  return compactCss(next);
}

export function transformManagedTailwindImportCss(source: string) {
  return upsertManagedTailwindImport(source);
}

async function patchComponentsJson(
  filepath: string,
  config: DesignSystemConfig,
) {
  const current = await fs.readJson(filepath);
  const { rsc: _rsc, tsx: _tsx, ...normalizedCurrent } = current;
  const next = {
    ...normalizedCurrent,
    $schema: BEJAMAS_COMPONENTS_SCHEMA_URL,
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

async function patchCssFileWithAstroFont(
  filepath: string,
  fontVariable?: string,
) {
  const current = await fs.readFile(filepath, "utf8");
  const next = transformAstroManagedFontCss(current, fontVariable);
  await fs.writeFile(filepath, next, "utf8");
}

async function patchCssFileManagedTailwindImport(filepath: string) {
  const current = await fs.readFile(filepath, "utf8");
  const next = transformManagedTailwindImportCss(current);
  await fs.writeFile(filepath, next, "utf8");
}

function getSelectedIconPackageName(config: DesignSystemConfig) {
  return ICON_LIBRARIES.find((library) => library.name === config.iconLibrary)
    ?.packageName;
}

async function patchPackageJsonIconDependency(
  filepath: string,
  config: DesignSystemConfig,
) {
  const selectedIconPackage = getSelectedIconPackageName(config);

  if (!selectedIconPackage) {
    return;
  }

  const packageJson = await fs.readJson(filepath);
  let targetField: "dependencies" | "devDependencies" | null = null;
  let changed = false;

  for (const field of ["dependencies", "devDependencies"] as const) {
    const dependencies = packageJson[field];

    if (!dependencies) {
      continue;
    }

    for (const iconPackage of MANAGED_ICON_PACKAGES) {
      if (!dependencies[iconPackage]) {
        continue;
      }

      targetField ??= field;

      if (iconPackage === selectedIconPackage) {
        continue;
      }

      delete dependencies[iconPackage];
      changed = true;
    }
  }

  if (!targetField) {
    return;
  }

  const alreadyHasSelectedPackage =
    packageJson.dependencies?.[selectedIconPackage] ||
    packageJson.devDependencies?.[selectedIconPackage];

  if (!alreadyHasSelectedPackage) {
    packageJson[targetField] ??= {};
    packageJson[targetField][selectedIconPackage] =
      FALLBACK_ICON_PACKAGE_VERSION;
    changed = true;
  }

  if (changed) {
    await fs.writeJson(filepath, packageJson, { spaces: 2 });
  }
}

async function syncPackageIconDependencies(
  projectPath: string,
  config: DesignSystemConfig,
) {
  const packageJsonFiles = await fg("**/package.json", {
    cwd: projectPath,
    absolute: true,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.astro/**"],
  });

  await Promise.all(
    packageJsonFiles.map((filepath) =>
      patchPackageJsonIconDependency(filepath, config),
    ),
  );
}

export async function syncManagedTailwindCss(projectPath: string) {
  const componentJsonFiles = await fg("**/components.json", {
    cwd: projectPath,
    absolute: true,
    ignore: ["**/node_modules/**"],
  });

  await Promise.all(
    componentJsonFiles.map(async (componentJsonPath) => {
      const componentJson = await fs.readJson(componentJsonPath);
      const cssRelativePath = componentJson?.tailwind?.css;

      if (typeof cssRelativePath !== "string" || cssRelativePath.length === 0) {
        return;
      }

      const cssPath = path.resolve(
        path.dirname(componentJsonPath),
        cssRelativePath,
      );

      if (!(await fs.pathExists(cssPath))) {
        return;
      }

      await patchCssFileManagedTailwindImport(cssPath);
    }),
  );
}

export async function syncAstroManagedFontCss(
  projectPath: string,
  fontVariable?: string,
) {
  const componentJsonFiles = await fg("**/components.json", {
    cwd: projectPath,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.astro/**"],
  });

  const cssFiles = new Set<string>();

  for (const relativePath of componentJsonFiles) {
    const absolutePath = path.resolve(projectPath, relativePath);
    const json = await fs.readJson(absolutePath);
    const cssPath = json?.tailwind?.css;
    if (typeof cssPath === "string" && cssPath.length > 0) {
      cssFiles.add(path.resolve(path.dirname(absolutePath), cssPath));
    }
  }

  await Promise.all(
    Array.from(cssFiles).map((filepath) =>
      patchCssFileWithAstroFont(filepath, fontVariable),
    ),
  );
}

async function patchTemplateI18nFile(
  filepath: string,
  config: DesignSystemConfig,
) {
  if (!config.rtl) {
    return;
  }

  const nextLanguage = getDocumentLanguage(config);
  const variant = getTemplateI18nVariant(filepath);
  const nextSource = buildTemplateI18nSource(variant, nextLanguage);

  if (!(await fs.pathExists(filepath))) {
    await fs.ensureDir(path.dirname(filepath));
    await fs.writeFile(filepath, nextSource, "utf8");
    return;
  }

  const current = await fs.readFile(filepath, "utf8");
  const next = current.includes("export const CURRENT_LANGUAGE")
    ? current.replace(
        /export const CURRENT_LANGUAGE: TemplateLanguage = "[^"]+";/,
        `export const CURRENT_LANGUAGE: TemplateLanguage = "${nextLanguage}";`,
      )
    : nextSource;

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

  if (config.rtl) {
    const next = transformTemplateLayoutToI18n(current);

    if (next !== current) {
      await fs.writeFile(filepath, next, "utf8");
    }

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

async function patchStarterPageFile(
  filepath: string,
  config: DesignSystemConfig,
) {
  if (!config.rtl || !(await fs.pathExists(filepath))) {
    return;
  }

  const current = await fs.readFile(filepath, "utf8");
  const next = transformStarterPageToI18n(current);

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

  for (const relativePath of componentJsonFiles) {
    const absolutePath = path.resolve(projectPath, relativePath);
    await patchComponentsJson(absolutePath, config);

    const json = await fs.readJson(absolutePath);
    const cssPath = json?.tailwind?.css;
    if (typeof cssPath === "string" && cssPath.length > 0) {
      const absoluteCssPath = path.resolve(path.dirname(absolutePath), cssPath);
      cssFiles.add(absoluteCssPath);
    }
  }

  await Promise.all(
    Array.from(cssFiles).map((filepath) =>
      patchCssFileWithTheme(filepath, config, options.themeVars),
    ),
  );
  await syncPackageIconDependencies(projectPath, config);
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
    ].map((filepath) => patchLayoutFile(filepath, config)),
  );
  await Promise.all(
    [
      path.resolve(projectPath, "src/pages/index.astro"),
      path.resolve(projectPath, "apps/web/src/pages/index.astro"),
    ].map((filepath) => patchStarterPageFile(filepath, config)),
  );

  const managedFonts = [
    toManagedAstroFont(config.font),
    config.fontHeading !== "inherit"
      ? toManagedAstroFont(`font-heading-${config.fontHeading}`)
      : null,
  ].filter((font): font is NonNullable<typeof font> => font !== null);
  const managedFont = managedFonts.find(
    (font) => font.cssVariable !== "--font-heading",
  );

  if (managedFonts.length > 0 && managedFont) {
    await syncAstroFontsInProject(
      projectPath,
      managedFonts,
      managedFont.cssVariable,
    );
    await cleanupAstroFontPackages(projectPath);
  }
}
