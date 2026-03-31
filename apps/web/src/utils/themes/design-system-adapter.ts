import {
  buildRegistryTheme,
  getFontValue,
  getHeadingFontValue,
  isSharedShadcnStyle,
  type DesignSystemConfig,
} from "@bejamas/create-config/browser";
import type { ThemeStyles } from "../types/theme";
import { applyThemeToCss } from "./apply-theme";
import {
  mergeThemeStyles,
  normalizeThemeOverrides,
  type ThemeOverrides,
} from "./create-theme";
import { defaultPresets } from "./presets";
import { SHADOW_INPUT_KEYS } from "./theme-tokens";

type ThemeMode = "light" | "dark";
type ThemeStyleMap = Record<string, string>;

const defaultThemeStyles = defaultPresets.default.styles;
const SHADOW_INPUT_KEY_SET = new Set<string>(SHADOW_INPUT_KEYS);

export interface ResolvedDesignSystemTheme {
  styles: ThemeStyles;
  font: {
    family: string | null;
  };
}

export function resolveDesignSystemTheme(
  config: DesignSystemConfig,
  overrides?: Partial<ThemeOverrides> | null,
): ResolvedDesignSystemTheme {
  const includeGeneratedShadows = shouldIncludeGeneratedShadows(config.style);
  const registryTheme = buildRegistryTheme(config);
  const selectedFont = getFontValue(config.font);
  const lightStyles = resolveThemeModeStyles("light", registryTheme.cssVars.light, {
    includeGeneratedShadows,
  });
  const darkStyles = resolveThemeModeStyles("dark", registryTheme.cssVars.dark, {
    includeGeneratedShadows,
  });
  const sharedFontStyles = resolveSharedFontStyles(config);
  const normalizedOverrides = resolveThemeOverrides(
    config.style,
    overrides,
    includeGeneratedShadows,
  );
  const styles = mergeThemeStyles(
    {
      light: {
        ...lightStyles,
        ...sharedFontStyles,
      },
      dark: {
        ...darkStyles,
        ...sharedFontStyles,
      },
    } as ThemeStyles,
    normalizedOverrides,
  );

  return {
    styles,
    font: {
      family: selectedFont?.font.family ?? null,
    },
  };
}

export function buildDesignSystemThemeCss(
  config: DesignSystemConfig,
  overrides?: Partial<ThemeOverrides> | null,
) {
  const includeGeneratedShadows = shouldIncludeGeneratedShadows(config.style);

  return applyThemeToCss({
    currentMode: "light",
    styles: resolveDesignSystemTheme(config, overrides).styles,
  }, {
    includeGeneratedShadows,
  }).replace(
    "html[data-theme=\"dark\"], html.dark {",
    "html[data-theme=\"dark\"], html.dark, .cn-menu-target.dark {",
  );
}

export function buildDesignSystemThemeCssVars(
  config: DesignSystemConfig,
  overrides?: Partial<ThemeOverrides> | null,
) {
  const baseTheme = buildRegistryTheme(config);
  const normalized = normalizeThemeOverrides(overrides);

  return {
    theme: baseTheme.cssVars.theme,
    light: {
      ...(baseTheme.cssVars.light ?? {}),
      ...normalized.light,
    },
    dark: {
      ...(baseTheme.cssVars.dark ?? {}),
      ...normalized.dark,
    },
  };
}

function resolveThemeModeStyles(
  mode: ThemeMode,
  resolvedVars?: Record<string, string>,
  options?: {
    includeGeneratedShadows?: boolean;
  },
): ThemeStyleMap {
  const includeGeneratedShadows = options?.includeGeneratedShadows ?? true;
  const fallback = defaultThemeStyles[mode] ?? {};

  return {
    ...(includeGeneratedShadows ? fallback : omitShadowTokens(fallback)),
    ...(resolvedVars ?? {}),
  };
}

function resolveThemeOverrides(
  style: DesignSystemConfig["style"],
  overrides?: Partial<ThemeOverrides> | null,
  includeGeneratedShadows = shouldIncludeGeneratedShadows(style),
): ThemeOverrides {
  const normalized = normalizeThemeOverrides(overrides);

  if (includeGeneratedShadows) {
    return normalized;
  }

  return {
    light: omitShadowTokens(normalized.light),
    dark: omitShadowTokens(normalized.dark),
  };
}

function shouldIncludeGeneratedShadows(style: DesignSystemConfig["style"]) {
  return !isSharedShadcnStyle(style);
}

function omitShadowTokens(styles?: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(styles ?? {}).filter(([key]) => !SHADOW_INPUT_KEY_SET.has(key)),
  ) as ThemeStyleMap;
}

function resolveSharedFontStyles(config: DesignSystemConfig): ThemeStyleMap {
  const selectedFont = getFontValue(config.font);
  const selectedHeadingFont =
    config.fontHeading === "inherit" || config.fontHeading === config.font
      ? selectedFont
      : getHeadingFontValue(config.fontHeading);
  const defaultLightStyles = defaultThemeStyles.light ?? {};
  const styles: ThemeStyleMap = {
    "font-sans": defaultLightStyles["font-sans"] ?? "Inter, sans-serif",
    "font-heading":
      defaultLightStyles["font-heading"] ??
      defaultLightStyles["font-sans"] ??
      "Inter, sans-serif",
    "font-serif": defaultLightStyles["font-serif"] ?? "ui-serif, Georgia, serif",
    "font-mono":
      defaultLightStyles["font-mono"] ??
      "ui-monospace, SFMono-Regular, monospace",
  };

  if (!selectedFont) {
    return styles;
  }

  // Match shadcn's create preview behavior: always surface the selected font
  // through the main sans variable, then preserve the font's native slot too.
  styles["font-sans"] = selectedFont.font.family;

  if (selectedFont.font.variable === "--font-serif") {
    styles["font-serif"] = selectedFont.font.family;
  }

  if (selectedFont.font.variable === "--font-mono") {
    styles["font-mono"] = selectedFont.font.family;
  }

  if (selectedHeadingFont) {
    styles["font-heading"] = selectedHeadingFont.font.family;
  }

  return styles;
}
