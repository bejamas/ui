import fs from "fs-extra";
import {
  buildRegistryTheme,
  DEFAULT_PRESET_CONFIG,
  encodePreset,
  getFontValue,
  getHeadingFontValue,
  getRadiusValue,
  getStyleDefaultRadius,
  PRESET_BASE_COLORS,
  PRESET_FONTS,
  PRESET_FONT_HEADINGS,
  PRESET_ICON_LIBRARIES,
  PRESET_MENU_ACCENTS,
  PRESET_MENU_COLORS,
  PRESET_RADII,
  PRESET_STYLES,
  PRESET_THEMES,
  type DesignSystemConfig,
  type PresetConfig,
} from "@bejamas/create-config/server";

import type { Config } from "@/src/utils/get-config";
import {
  readManagedAstroFontsFromProject,
  toManagedAstroFont,
  type ManagedAstroFont,
} from "@/src/utils/astro-fonts";

type CssState = {
  darkVars: Record<string, string>;
  imports: string[];
  rootVars: Record<string, string>;
  source: string;
  themeVars: Record<string, string>;
};

type RootFontVariable = "--font-sans" | "--font-serif" | "--font-mono";
type FontVariable = RootFontVariable | "--font-heading";

export type ResolvedProjectPreset = {
  code: string | null;
  fallbacks: string[];
  values: PresetConfig | null;
};

const PRESET_BASE_COLOR_SET = new Set<string>(PRESET_BASE_COLORS);
const PRESET_FONT_SET = new Set<string>(PRESET_FONTS);
const PRESET_FONT_HEADING_SET = new Set<string>(PRESET_FONT_HEADINGS);
const PRESET_ICON_LIBRARY_SET = new Set<string>(PRESET_ICON_LIBRARIES);
const PRESET_MENU_ACCENT_SET = new Set<string>(PRESET_MENU_ACCENTS);
const PRESET_MENU_COLOR_SET = new Set<string>(PRESET_MENU_COLORS);
const PRESET_STYLE_SET = new Set<string>(PRESET_STYLES);
const PRESET_THEME_SET = new Set<string>(PRESET_THEMES);
const ROOT_FONT_VARIABLES = [
  "--font-sans",
  "--font-serif",
  "--font-mono",
] as const satisfies readonly RootFontVariable[];
const ROOT_FONT_VARIABLE_SET = new Set<string>(ROOT_FONT_VARIABLES);
const FONT_VARIABLE_SET = new Set<string>([
  ...ROOT_FONT_VARIABLES,
  "--font-heading",
]);

export async function resolveProjectPreset(
  config: Config,
): Promise<ResolvedProjectPreset> {
  const style = normalizePresetStyle(config.style);

  if (!style) {
    return {
      code: null,
      fallbacks: [],
      values: null,
    };
  }

  const cssState = await readCssState(config.resolvedPaths.tailwindCss);
  const baseColor =
    asPresetValue<PresetConfig["baseColor"]>(
      PRESET_BASE_COLOR_SET,
      config.tailwind.baseColor,
    ) ?? DEFAULT_PRESET_CONFIG.baseColor;
  const iconLibrary =
    asPresetValue<PresetConfig["iconLibrary"]>(
      PRESET_ICON_LIBRARY_SET,
      config.iconLibrary,
    ) ?? DEFAULT_PRESET_CONFIG.iconLibrary;
  const menuAccent =
    asPresetValue<PresetConfig["menuAccent"]>(
      PRESET_MENU_ACCENT_SET,
      config.menuAccent,
    ) ?? DEFAULT_PRESET_CONFIG.menuAccent;
  const menuColor =
    asPresetValue<PresetConfig["menuColor"]>(
      PRESET_MENU_COLOR_SET,
      config.menuColor,
    ) ?? DEFAULT_PRESET_CONFIG.menuColor;
  const resolvedTheme = matchTheme(cssState, {
    baseColor,
    menuAccent,
    menuColor,
    style,
  });
  const theme = resolvedTheme ?? getFallbackTheme(baseColor);
  const resolvedRadius = matchRadius(cssState.rootVars["--radius"], style);
  const radius = resolvedRadius ?? DEFAULT_PRESET_CONFIG.radius;
  const resolvedFont = await resolveBodyFont(config, cssState);
  const font = resolvedFont ?? DEFAULT_PRESET_CONFIG.font;
  const resolvedFontHeading = await resolveHeadingFont(
    config,
    cssState,
    font,
  );
  const fontHeading = normalizeFontHeading(
    resolvedFontHeading ?? DEFAULT_PRESET_CONFIG.fontHeading,
    font,
  );

  const values = {
    style,
    baseColor,
    theme,
    iconLibrary,
    font,
    fontHeading,
    radius,
    menuAccent,
    menuColor,
  } satisfies PresetConfig;
  const fallbacks = [
    !asPresetValue(PRESET_BASE_COLOR_SET, config.tailwind.baseColor) &&
      "baseColor",
    !resolvedTheme && "theme",
    !asPresetValue(PRESET_ICON_LIBRARY_SET, config.iconLibrary) &&
      "iconLibrary",
    !resolvedFont && "font",
    !resolvedFontHeading && "fontHeading",
    !resolvedRadius && "radius",
    !asPresetValue(PRESET_MENU_ACCENT_SET, config.menuAccent) && "menuAccent",
    !asPresetValue(PRESET_MENU_COLOR_SET, config.menuColor) && "menuColor",
  ].filter(Boolean) as string[];

  return {
    code: encodePreset(values),
    fallbacks,
    values,
  };
}

async function readCssState(tailwindCssPath?: string): Promise<CssState> {
  const fallback = {
    darkVars: {},
    imports: [],
    rootVars: {},
    source: "",
    themeVars: {},
  };

  if (!tailwindCssPath || !(await fs.pathExists(tailwindCssPath))) {
    return fallback;
  }

  try {
    const source = await fs.readFile(tailwindCssPath, "utf8");

    return {
      darkVars: collectBlockDeclarations(source, ".dark"),
      imports: collectImports(source),
      rootVars: collectBlockDeclarations(source, ":root"),
      source,
      themeVars: collectAtRuleDeclarations(source, "@theme inline"),
    };
  } catch {
    return fallback;
  }
}

function collectImports(source: string) {
  const imports: string[] = [];
  const pattern = /@import\s+(?:url\((['"]?)(.+?)\1\)|(['"])(.+?)\3)\s*;/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source))) {
    const value = match[2] ?? match[4];
    if (value) {
      imports.push(value);
    }
  }

  return imports;
}

function collectBlockDeclarations(source: string, selector: string) {
  const pattern = new RegExp(
    `${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\}`,
    "m",
  );
  const match = source.match(pattern);

  return match ? collectDeclarations(match[1]) : {};
}

function collectAtRuleDeclarations(source: string, atRule: string) {
  const pattern = new RegExp(
    `${escapeRegExp(atRule)}\\s*\\{([\\s\\S]*?)\\}`,
    "m",
  );
  const match = source.match(pattern);

  return match ? collectDeclarations(match[1]) : {};
}

function collectDeclarations(source: string) {
  const declarations: Record<string, string> = {};
  const pattern = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source))) {
    declarations[match[1]] = match[2].trim();
  }

  return declarations;
}

function matchTheme(
  state: CssState,
  options: Pick<
    PresetConfig,
    "baseColor" | "menuAccent" | "menuColor" | "style"
  >,
) {
  const lightPrimary = state.rootVars["--primary"];
  if (!lightPrimary) {
    return null;
  }

  for (const theme of PRESET_THEMES) {
    let registryTheme: ReturnType<typeof buildRegistryTheme>["cssVars"];

    try {
      registryTheme = buildRegistryTheme({
        ...DEFAULT_DESIGN_SYSTEM_FOR_MATCHING,
        ...options,
        theme,
      }).cssVars;
    } catch {
      continue;
    }

    const expectedLight = registryTheme.light?.primary;
    const expectedDark = registryTheme.dark?.primary;

    if (!valuesMatch(lightPrimary, expectedLight)) {
      continue;
    }

    const darkPrimary = state.darkVars["--primary"];
    if (darkPrimary && expectedDark && !valuesMatch(darkPrimary, expectedDark)) {
      continue;
    }

    return theme;
  }

  return null;
}

function getFallbackTheme(baseColor: PresetConfig["baseColor"]) {
  return baseColor === DEFAULT_PRESET_CONFIG.baseColor
    ? DEFAULT_PRESET_CONFIG.theme
    : baseColor;
}

function matchRadius(value: string | undefined, style: PresetConfig["style"]) {
  if (!value) {
    return null;
  }

  const normalizedValue = normalizeCssValue(value);
  const styleDefaultRadius = getStyleDefaultRadius(style);

  if (
    styleDefaultRadius &&
    normalizedValue === normalizeCssValue(getRadiusValue(styleDefaultRadius))
  ) {
    return "default";
  }

  for (const radius of PRESET_RADII) {
    if (normalizedValue === normalizeCssValue(getRadiusValue(radius))) {
      return radius === "default" ? "medium" : radius;
    }
  }

  return null;
}

async function resolveBodyFont(config: Config, state: CssState) {
  const activeVariable = resolveActiveBodyFontVariable(state);
  const managedFonts = await readManagedAstroFontsFromProject(
    config.resolvedPaths.cwd,
  );
  const managedFont = activeVariable
    ? managedFonts.find((font) => font.cssVariable === activeVariable)
    : managedFonts.find((font) =>
        ROOT_FONT_VARIABLE_SET.has(font.cssVariable),
      );
  const matchedManagedFont = matchManagedFont(managedFont, "body");

  if (matchedManagedFont) {
    return matchedManagedFont;
  }

  const matchedImport = activeVariable
    ? matchFontByImports(state.imports, activeVariable)
    : null;
  if (matchedImport) {
    return matchedImport;
  }

  for (const variable of ROOT_FONT_VARIABLES) {
    const matched = matchFontFromVariable(state, variable);
    if (matched) {
      return matched;
    }
  }

  return null;
}

async function resolveHeadingFont(
  config: Config,
  state: CssState,
  bodyFont: PresetConfig["font"],
) {
  const managedFonts = await readManagedAstroFontsFromProject(
    config.resolvedPaths.cwd,
  );
  const managedHeadingFont = matchManagedFont(
    managedFonts.find((font) => font.cssVariable === "--font-heading"),
    "heading",
  );

  if (managedHeadingFont) {
    return managedHeadingFont === bodyFont ? "inherit" : managedHeadingFont;
  }

  const resolved = resolveFontValue(state, "--font-heading");
  const matched = resolved ? parseFontFromFamily(resolved) : null;
  if (matched) {
    return matched === bodyFont ? "inherit" : matched;
  }

  const value = getCssVariableValue(state, "--font-heading");
  const reference = value ? getVarReference(value) : null;
  if (reference && ROOT_FONT_VARIABLE_SET.has(reference)) {
    const matchedRootFont = matchFontFromVariable(
      state,
      reference as RootFontVariable,
    );

    if (!matchedRootFont || matchedRootFont === bodyFont) {
      return "inherit";
    }

    return matchedRootFont;
  }

  return "inherit";
}

function normalizePresetStyle(style: string | undefined) {
  if (!style) {
    return null;
  }

  const normalized = style.replace(/^(bejamas|base|radix)-/, "");
  if (!PRESET_STYLE_SET.has(normalized)) {
    return null;
  }

  return normalized as PresetConfig["style"];
}

function normalizeFontHeading(
  fontHeading: PresetConfig["fontHeading"],
  bodyFont: PresetConfig["font"],
) {
  const normalized = fontHeading === bodyFont ? "inherit" : fontHeading;

  return PRESET_FONT_HEADING_SET.has(normalized)
    ? normalized
    : DEFAULT_PRESET_CONFIG.fontHeading;
}

function resolveActiveBodyFontVariable(state: CssState) {
  const htmlOrBodyFont = state.source.match(
    /(?:html|body)\s*\{[\s\S]*?@apply[^;]*\bfont-(sans|serif|mono)\b[\s\S]*?\}/m,
  )?.[1];

  if (htmlOrBodyFont) {
    return `--font-${htmlOrBodyFont}` as RootFontVariable;
  }

  for (const variable of ROOT_FONT_VARIABLES) {
    if (state.themeVars[variable]) {
      return variable;
    }
  }

  return null;
}

function matchManagedFont(
  managedFont: ManagedAstroFont | undefined,
  slot: "body" | "heading",
) {
  if (!managedFont) {
    return null;
  }

  for (const font of PRESET_FONTS) {
    const expected =
      slot === "heading"
        ? toManagedAstroFont(`font-heading-${font}`)
        : toManagedAstroFont(font);

    if (
      expected &&
      expected.cssVariable === managedFont.cssVariable &&
      normalizeFontName(expected.name) === normalizeFontName(managedFont.name)
    ) {
      return font;
    }
  }

  return null;
}

function matchFontByImports(
  imports: string[],
  variable: RootFontVariable,
) {
  const matches = imports.flatMap((input) => {
    const font = parseFontFromDependency(input);
    const fontValue = font ? getFontValue(font) : null;

    return font && fontValue?.font.variable === variable ? [font] : [];
  });

  return matches.length === 1 ? matches[0] : null;
}

function matchFontFromVariable(state: CssState, variable: FontVariable) {
  const resolved = resolveFontValue(state, variable);

  return resolved ? parseFontFromFamily(resolved) : null;
}

function resolveFontValue(
  state: CssState,
  variable: FontVariable,
  seen = new Set<string>(),
): string | null {
  if (seen.has(variable)) {
    return null;
  }

  seen.add(variable);

  const value = getCssVariableValue(state, variable);
  if (!value) {
    return null;
  }

  const reference = getVarReference(value);
  if (!reference) {
    return value;
  }

  if (FONT_VARIABLE_SET.has(reference)) {
    return resolveFontValue(state, reference as FontVariable, seen);
  }

  return null;
}

function getCssVariableValue(state: CssState, variable: FontVariable) {
  const themeValue = state.themeVars[variable];
  if (themeValue && getVarReference(themeValue) !== variable) {
    return themeValue;
  }

  return state.rootVars[variable] ?? themeValue ?? null;
}

function getVarReference(value: string) {
  const normalized = normalizeCssValue(value);
  const match = normalized.match(/^var\((--[a-z0-9-]+)\)$/);

  return match?.[1] ?? null;
}

function parseFontFromDependency(value: string | undefined) {
  if (!value) {
    return null;
  }

  const prefix = "@fontsource-variable/";
  const normalized = normalizeCssValue(value);

  return normalized.startsWith(prefix)
    ? toPresetFont(normalized.slice(prefix.length))
    : null;
}

function parseFontFromFamily(value: string | undefined) {
  if (!value) {
    return null;
  }

  const primaryFamily = normalizeFontName(value.split(",")[0] ?? "");

  for (const font of PRESET_FONTS) {
    const bodyFont = getFontValue(font);
    const headingFont = getHeadingFontValue(font);
    const candidates = [
      font,
      bodyFont?.title,
      bodyFont?.font.family.split(",")[0],
      bodyFont?.font.import,
      headingFont?.title?.replace(/\s+\(Heading\)$/, ""),
      headingFont?.font.family.split(",")[0],
      headingFont?.font.import,
    ];

    if (
      candidates.some(
        (candidate) =>
          candidate && normalizeFontName(candidate) === primaryFamily,
      )
    ) {
      return font;
    }
  }

  return null;
}

function toPresetFont(value: string | undefined) {
  const normalized = normalizeCssValue(value);

  return PRESET_FONT_SET.has(normalized)
    ? (normalized as PresetConfig["font"])
    : null;
}

function normalizeFontName(value: string) {
  return value
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\s+variable$/i, "")
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function normalizeCssValue(value: string | undefined) {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .replace(/-?\d*\.\d+/g, (match) => String(Number(match)))
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s*\/\s*/g, "/")
    .replace(/"/g, "'")
    .toLowerCase();
}

function valuesMatch(
  actual: string | undefined,
  expected: string | undefined,
) {
  return normalizeCssValue(actual) === normalizeCssValue(expected);
}

function asPresetValue<T extends string>(
  set: Set<string>,
  value: string | undefined,
) {
  return value && set.has(value) ? (value as T) : null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const DEFAULT_DESIGN_SYSTEM_FOR_MATCHING = {
  ...DEFAULT_PRESET_CONFIG,
  template: "astro",
  rtl: false,
  rtlLanguage: "ar",
} satisfies DesignSystemConfig;
