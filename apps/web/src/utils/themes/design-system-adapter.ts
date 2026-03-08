import {
  buildRegistryTheme,
  getFontValue,
  type DesignSystemConfig,
} from "@bejamas/create-config/browser";
import type { ThemeStyles } from "../types/theme";
import { applyThemeToCss } from "./apply-theme";
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
): ResolvedDesignSystemTheme {
  const registryTheme = buildRegistryTheme(config);
  const selectedFont = getFontValue(config.font);
  const lightStyles = resolveThemeModeStyles("light", registryTheme.cssVars.light);
  const darkStyles = resolveThemeModeStyles("dark", registryTheme.cssVars.dark);
  const sharedFontStyles = resolveSharedFontStyles(config);

  return {
    styles: {
      light: {
        ...lightStyles,
        ...sharedFontStyles,
      },
      dark: {
        ...darkStyles,
        ...sharedFontStyles,
      },
    } as ThemeStyles,
    font: {
      family: selectedFont?.font.family ?? null,
    },
  };
}

export function buildDesignSystemThemeCss(config: DesignSystemConfig) {
  return applyThemeToCss({
    currentMode: "light",
    styles: resolveDesignSystemTheme(config).styles,
  }).replace(
    "html[data-theme=\"dark\"], html.dark {",
    "html[data-theme=\"dark\"], html.dark, .cn-menu-target.dark {",
  );
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
