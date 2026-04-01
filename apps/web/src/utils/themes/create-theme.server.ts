import { isCustomThemeRef, normalizeThemeOverrides, type ThemeOverrides } from "./create-theme";

export async function getThemeOverridesByRef(
  themeRef: string | null | undefined,
): Promise<ThemeOverrides | null> {
  if (!isCustomThemeRef(themeRef)) {
    return null;
  }

  const { getCustomTheme } = await import("@/lib/redis");
  const theme = await getCustomTheme(themeRef);
  if (!theme) {
    return null;
  }

  return normalizeThemeOverrides({
    light: theme.styles.light,
    dark: theme.styles.dark,
  });
}
