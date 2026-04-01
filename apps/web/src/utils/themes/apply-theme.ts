// import { ThemeEditorState } from "@/types/editor";
import type { ThemeStyleProps, ThemeStyles } from "../types/theme";
import type { ThemeEditorState } from "../types/editor";
import {
  getShadowMap,
  setShadowVariables,
  TAILWIND_DEFAULT_SHADOW_MAP,
} from "./shadows";
import { applyStyleToElement } from "./apply-style-to-element";
import {
  COMMON_NON_COLOR_KEYS,
  isShadowInputKey,
  normalizeThemeTokenValue,
  SHADOW_INPUT_KEYS,
} from "./theme-tokens";

type Theme = "dark" | "light";

// Helper functions (not exported, used internally by applyThemeToElement)
const updateThemeClass = (root: HTMLElement, mode: Theme) => {
  if (mode === "light") {
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
  }
};

const clearThemeVariables = (
  root: HTMLElement,
  keys: readonly string[],
) => {
  keys.forEach((key) => {
    root.style.removeProperty(`--${key}`);
  });
};

const applyCommonStyles = (
  root: HTMLElement,
  themeStyles: ThemeStyleProps,
  includeGeneratedShadows: boolean,
) => {
  Object.entries(themeStyles)
    .filter(([key]) =>
      COMMON_NON_COLOR_KEYS.includes(
        key as (typeof COMMON_NON_COLOR_KEYS)[number],
      ),
    )
    .forEach(([key, value]) => {
      if (!includeGeneratedShadows && isShadowInputKey(key)) {
        return;
      }

      if (typeof value === "string") {
        applyStyleToElement(root, key, value);
      }
    });
};

const applyThemeColors = (
  root: HTMLElement,
  themeStyles: ThemeStyles,
  mode: Theme,
  includeGeneratedShadows: boolean,
) => {
  Object.entries(themeStyles[mode]).forEach(([key, value]) => {
    if (!includeGeneratedShadows && isShadowInputKey(key)) {
      return;
    }

    if (
      typeof value === "string" &&
      !COMMON_NON_COLOR_KEYS.includes(
        key as (typeof COMMON_NON_COLOR_KEYS)[number],
      )
    ) {
      applyStyleToElement(root, key, normalizeThemeTokenValue(key, value));
    }
  });
};

export interface ApplyThemeToElementOptions {
  /** When true, do not set/remove the dark class; caller owns light/dark mode (e.g. ThemeProvider). */
  skipModeClass?: boolean;
  includeGeneratedShadows?: boolean;
}

// Exported function to apply theme styles to an element
export const applyThemeToElement = (
  themeState: ThemeEditorState,
  rootElement: HTMLElement,
  options?: ApplyThemeToElementOptions,
) => {
  const { currentMode: mode, styles: themeStyles } = themeState;
  const includeGeneratedShadows = options?.includeGeneratedShadows ?? true;

  if (!rootElement) return;

  if (!options?.skipModeClass) {
    updateThemeClass(rootElement, mode);
  }
  // Apply common styles (like border-radius) based on the 'light' mode definition
  applyCommonStyles(rootElement, themeStyles.light, includeGeneratedShadows);
  // Apply mode-specific colors
  applyThemeColors(rootElement, themeStyles, mode, includeGeneratedShadows);
  // Shared shadcn styles use upstream default shadow tokens instead of
  // the Bejamas-generated tinted shadow pipeline.
  if (includeGeneratedShadows) {
    setShadowVariables(themeState, rootElement);
  } else {
    clearThemeVariables(rootElement, SHADOW_INPUT_KEYS);
    Object.entries(TAILWIND_DEFAULT_SHADOW_MAP).forEach(([key, value]) => {
      applyStyleToElement(rootElement, key, value);
    });
  }
};

// Ensure global is available as early as possible for render-blocking consumers
if (typeof window !== "undefined") {
  // Preserve any existing namespace
  (window as any).bejamas = (window as any).bejamas || {};
  (window as any).bejamas.applyThemeToElement = applyThemeToElement;
}

// Generate full CSS text for the provided theme styles
export interface ApplyThemeToCssOptions {
  includeGeneratedShadows?: boolean;
}

export function applyThemeToCss(
  themeState: ThemeEditorState,
  options?: ApplyThemeToCssOptions,
): string {
  const includeGeneratedShadows = options?.includeGeneratedShadows ?? true;

  const buildCssVars = (vars: Record<string, string>): string => {
    return Object.entries(vars)
      .map(([key, value]) => `  --${key}: ${value};`)
      .join("\n");
  };

  const buildColorVars = (styles: ThemeStyleProps): Record<string, string> => {
    const out: Record<string, string> = {};
    Object.entries(styles).forEach(([key, value]) => {
      if (!includeGeneratedShadows && isShadowInputKey(key)) {
        return;
      }

      const isCommon = COMMON_NON_COLOR_KEYS.includes(
        key as (typeof COMMON_NON_COLOR_KEYS)[number],
      );
      if (isCommon) return;
      if (typeof value === "string") {
        out[`${key}`] = normalizeThemeTokenValue(key, value);
      }
    });
    return out;
  };

  // Common variables (non-color) come from light by convention
  const commonVars: Record<string, string> = {};
  Object.entries(themeState.styles.light).forEach(([key, value]) => {
    if (!includeGeneratedShadows && isShadowInputKey(key)) {
      return;
    }

    const isCommon = COMMON_NON_COLOR_KEYS.includes(
      key as (typeof COMMON_NON_COLOR_KEYS)[number],
    );
    if (!isCommon) return;
    if (typeof value === "string") {
      commonVars[key] = value.trim();
    }
  });

  // Color variables for each mode
  const lightColorVars = buildColorVars(themeState.styles.light);
  const darkColorVars = buildColorVars(themeState.styles.dark);

  // Shadow variables for each mode
  const lightShadows = includeGeneratedShadows
    ? getShadowMap({ ...themeState, currentMode: "light" })
    : TAILWIND_DEFAULT_SHADOW_MAP;
  const darkShadows = includeGeneratedShadows
    ? getShadowMap({ ...themeState, currentMode: "dark" })
    : TAILWIND_DEFAULT_SHADOW_MAP;

  const rootBlock = [
    "html:root {",
    buildCssVars({ ...commonVars, ...lightColorVars, ...lightShadows }),
    "}",
  ].join("\n");

  const darkBlock = [
    'html[data-theme="dark"], html.dark {',
    buildCssVars({ ...darkColorVars, ...darkShadows }),
    "}",
  ].join("\n");

  return [rootBlock, darkBlock].join("\n\n");
}
