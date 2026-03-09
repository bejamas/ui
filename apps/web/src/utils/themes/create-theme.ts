import { getThemesForBaseColor, type DesignSystemConfig } from "@bejamas/create-config/browser";
import type { ThemeStyleProps, ThemeStyles } from "../types/theme";

export type ThemeMode = "light" | "dark";

export type ThemeOverrides = {
  light: Partial<ThemeStyleProps>;
  dark: Partial<ThemeStyleProps>;
};

export type ThemeTokenSection = {
  title: string;
  tokens: Array<keyof ThemeStyleProps>;
};

export const CREATE_THEME_TOKEN_SECTIONS: ThemeTokenSection[] = [
  {
    title: "Core",
    tokens: [
      "background",
      "foreground",
      "primary",
      "primary-foreground",
      "secondary",
      "secondary-foreground",
      "accent",
      "accent-foreground",
    ],
  },
  {
    title: "Surfaces",
    tokens: [
      "card",
      "card-foreground",
      "popover",
      "popover-foreground",
      "muted",
      "muted-foreground",
    ],
  },
  {
    title: "Forms & feedback",
    tokens: [
      "border",
      "input",
      "ring",
      "destructive",
      "destructive-foreground",
    ],
  },
  {
    title: "Charts",
    tokens: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"],
  },
  {
    title: "Sidebar",
    tokens: [
      "sidebar",
      "sidebar-foreground",
      "sidebar-primary",
      "sidebar-primary-foreground",
      "sidebar-accent",
      "sidebar-accent-foreground",
      "sidebar-border",
      "sidebar-ring",
    ],
  },
  {
    title: "Footer",
    tokens: [
      "footer",
      "footer-foreground",
      "footer-primary",
      "footer-primary-foreground",
      "footer-border",
    ],
  },
];

export function emptyThemeOverrides(): ThemeOverrides {
  return {
    light: {},
    dark: {},
  };
}

export function normalizeThemeOverrides(
  overrides?: Partial<ThemeOverrides> | null,
): ThemeOverrides {
  return {
    light: { ...(overrides?.light ?? {}) },
    dark: { ...(overrides?.dark ?? {}) },
  };
}

export function hasThemeOverrides(
  overrides?: Partial<ThemeOverrides> | null,
) {
  if (!overrides) {
    return false;
  }

  return (
    Object.keys(overrides.light ?? {}).length > 0 ||
    Object.keys(overrides.dark ?? {}).length > 0
  );
}

export function mergeThemeStyles(
  styles: ThemeStyles,
  overrides?: Partial<ThemeOverrides> | null,
): ThemeStyles {
  const normalized = normalizeThemeOverrides(overrides);

  return {
    light: {
      ...styles.light,
      ...normalized.light,
    },
    dark: {
      ...styles.dark,
      ...normalized.dark,
    },
  };
}

export function getThemeRefFromSearchParams(
  searchParams: URLSearchParams,
  fallbackThemeRef?: string | null,
) {
  const urlThemeRef = searchParams.get("themeRef");

  if (isCustomThemeRef(urlThemeRef)) {
    return urlThemeRef;
  }

  if (isCustomThemeRef(fallbackThemeRef)) {
    return fallbackThemeRef;
  }

  return null;
}

export function isCustomThemeRef(value: string | null | undefined): value is string {
  return Boolean(value && /^custom-[a-z0-9-]+$/i.test(value));
}

export function createCustomThemeRef() {
  const random = Math.random().toString(36).slice(2, 8);
  return `custom-${Date.now()}-${random}`;
}

export function getCreateThemeSeedOptions(
  baseColor: DesignSystemConfig["baseColor"],
) {
  return getThemesForBaseColor(baseColor).map((theme) => {
    const lightVars = (theme.cssVars?.light ?? {}) as Record<string, string>;

    return {
      value: theme.name,
      label: theme.title ?? theme.name,
      color: lightVars.primary ?? lightVars.ring ?? "oklch(0.72 0 0)",
    };
  });
}

export function formatThemeTokenLabel(token: keyof ThemeStyleProps) {
  return String(token)
    .split("-")
    .map((segment) =>
      /^[0-9]+$/.test(segment)
        ? segment
        : segment.charAt(0).toUpperCase() + segment.slice(1),
    )
    .join(" ");
}

export function createThemeName(config: DesignSystemConfig) {
  return `Custom ${config.baseColor} ${config.theme}`;
}
