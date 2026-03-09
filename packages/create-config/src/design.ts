import { fonts } from "./catalog/fonts";
import { BASE_COLORS } from "./catalog/base-colors";
import { STYLES } from "./catalog/styles";
import { THEMES } from "./catalog/themes";
import {
  ICON_LIBRARY_COLLECTIONS,
  ICON_LIBRARY_PACKAGE_NAMES,
  type IconLibraryName,
} from "@bejamas/semantic-icons";
import {
  getBaseColor,
  getFontValue,
  getRadiusValue,
  getStyleId,
  getTheme,
  resolveEffectiveRadius,
  type DesignSystemConfig,
} from "./config";

export const ICON_LIBRARIES = [
  {
    name: "lucide",
    packageName: ICON_LIBRARY_PACKAGE_NAMES.lucide,
    collection: ICON_LIBRARY_COLLECTIONS.lucide,
    label: "Lucide",
  },
  {
    name: "hugeicons",
    packageName: ICON_LIBRARY_PACKAGE_NAMES.hugeicons,
    collection: ICON_LIBRARY_COLLECTIONS.hugeicons,
    label: "Hugeicons",
  },
  {
    name: "tabler",
    packageName: ICON_LIBRARY_PACKAGE_NAMES.tabler,
    collection: ICON_LIBRARY_COLLECTIONS.tabler,
    label: "Tabler",
  },
  {
    name: "phosphor",
    packageName: ICON_LIBRARY_PACKAGE_NAMES.phosphor,
    collection: ICON_LIBRARY_COLLECTIONS.phosphor,
    label: "Phosphor",
  },
  {
    name: "remixicon",
    packageName: ICON_LIBRARY_PACKAGE_NAMES.remixicon,
    collection: ICON_LIBRARY_COLLECTIONS.remixicon,
    label: "Remix Icon",
  },
] as const satisfies ReadonlyArray<{
  name: IconLibraryName;
  packageName: string;
  collection: string;
  label: string;
}>;

export function buildRegistryTheme(config: DesignSystemConfig) {
  const baseColor = getBaseColor(config.baseColor);
  const theme = getTheme(config.theme);

  if (!baseColor || !theme) {
    throw new Error(
      `Base color "${config.baseColor}" or theme "${config.theme}" not found.`,
    );
  }

  const lightVars: Record<string, string> = {
    ...(baseColor.cssVars?.light as Record<string, string>),
    ...(theme.cssVars?.light as Record<string, string>),
  };
  const darkVars: Record<string, string> = {
    ...(baseColor.cssVars?.dark as Record<string, string>),
    ...(theme.cssVars?.dark as Record<string, string>),
  };

  if (config.menuAccent === "bold") {
    lightVars.accent = lightVars.primary;
    lightVars["accent-foreground"] = lightVars["primary-foreground"];
    darkVars.accent = darkVars.primary;
    darkVars["accent-foreground"] = darkVars["primary-foreground"];
  }

  const effectiveRadius = resolveEffectiveRadius(config.style, config.radius);
  if (effectiveRadius !== "default") {
    const radius = getRadiusValue(effectiveRadius);
    if (radius) {
      lightVars.radius = radius;
      darkVars.radius = radius;
    }
  }

  const font = getFontValue(config.font);
  const themeVars: Record<string, string> = {};

  if (font) {
    themeVars["bejamas-font-family"] = font.font.family;
  }

  return {
    name: `${config.baseColor}-${config.theme}`,
    type: "registry:theme" as const,
    cssVars: {
      theme: Object.keys(themeVars).length ? themeVars : undefined,
      light: lightVars,
      dark: darkVars,
    },
  };
}

export function buildThemeCss(config: DesignSystemConfig) {
  const theme = buildRegistryTheme(config);
  const themeVars = theme.cssVars.theme ?? {};
  const lightVars = theme.cssVars.light ?? {};
  const darkVars = theme.cssVars.dark ?? {};
  const styleId = getStyleId(config.style);
  const lines = [
    ":root {",
    ...Object.entries(themeVars).map(([key, value]) => `  --${key}: ${value};`),
    ...Object.entries(lightVars).map(([key, value]) => `  --${key}: ${value};`),
    "}",
    ".dark, [data-theme=\"dark\"] {",
    ...Object.entries(darkVars).map(([key, value]) => `  --${key}: ${value};`),
    "}",
    `:root { --bejamas-style-id: ${styleId}; }`,
  ];

  return lines.join("\n");
}

export const catalogs = {
  themes: THEMES,
  baseColors: BASE_COLORS,
  fonts,
  styles: STYLES,
  iconLibraries: ICON_LIBRARIES,
};
