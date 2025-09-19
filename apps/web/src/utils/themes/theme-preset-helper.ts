import { defaultThemeState } from "./config";
import type { ThemeStyles } from "../types/theme";
import { getEntry } from "astro:content";

export async function getPresetThemeStyles(name: string): Promise<ThemeStyles> {
  const defaultTheme = defaultThemeState.styles;
  if (name === "default") {
    return defaultTheme;
  }

  const preset = await getEntry('themes', name);
  if (!preset) {
    return defaultTheme;
  }

  return {
    light: {
      ...defaultTheme.light,
      ...(preset.data.styles.light || {}),
    },
    dark: {
      ...defaultTheme.dark,
      ...(preset.data.styles.light || {}),
      ...(preset.data.styles.dark || {}),
    },
  };
}