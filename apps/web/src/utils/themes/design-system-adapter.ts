import {
  buildRegistryTheme,
  getFontValue,
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

type ThemeMode = "light" | "dark";
type ThemeStyleMap = Record<string, string>;

const defaultThemeStyles = defaultPresets.default.styles;

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
  const registryTheme = buildRegistryTheme(config);
  const selectedFont = getFontValue(config.font);
  const lightStyles = resolveThemeModeStyles("light", registryTheme.cssVars.light);
  const darkStyles = resolveThemeModeStyles("dark", registryTheme.cssVars.dark);
  const sharedFontStyles = resolveSharedFontStyles(config);
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
    overrides,
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
  return applyThemeToCss({
    currentMode: "light",
    styles: resolveDesignSystemTheme(config, overrides).styles,
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
): ThemeStyleMap {
  const fallback = defaultThemeStyles[mode] ?? {};

  return {
    ...fallback,
    ...(resolvedVars ?? {}),
  };
}

function resolveSharedFontStyles(config: DesignSystemConfig): ThemeStyleMap {
  const selectedFont = getFontValue(config.font);
  const defaultLightStyles = defaultThemeStyles.light ?? {};
  const styles: ThemeStyleMap = {
    "font-sans": defaultLightStyles["font-sans"] ?? "Inter, sans-serif",
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

  return styles;
}
