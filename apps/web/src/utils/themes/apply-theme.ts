// import { ThemeEditorState } from "@/types/editor";
import type { ThemeStyleProps, ThemeStyles } from "../types/theme";
import type { ThemeEditorState } from "../types/editor";
import { colorFormatter } from "./color-converter";
import { setShadowVariables, getShadowMap } from "./shadows";
import { applyStyleToElement } from "./apply-style-to-element";

type Theme = "dark" | "light";

const COMMON_NON_COLOR_KEYS = [
  "font-sans",
  "font-serif",
  "font-mono",
  "radius",
  "shadow-opacity",
  "shadow-blur",
  "shadow-spread",
  "shadow-offset-x",
  "shadow-offset-y",
  "letter-spacing",
  "spacing",
];

// Helper functions (not exported, used internally by applyThemeToElement)
const updateThemeClass = (root: HTMLElement, mode: Theme) => {
  if (mode === "light") {
    root.classList.remove("dark");
  } else {
    root.classList.add("dark");
  }
};

const applyCommonStyles = (root: HTMLElement, themeStyles: ThemeStyleProps) => {
  Object.entries(themeStyles)
    .filter(([key]) =>
      COMMON_NON_COLOR_KEYS.includes(
        key as (typeof COMMON_NON_COLOR_KEYS)[number],
      ),
    )
    .forEach(([key, value]) => {
      if (typeof value === "string") {
        applyStyleToElement(root, key, value);
      }
    });
};

const applyThemeColors = (
  root: HTMLElement,
  themeStyles: ThemeStyles,
  mode: Theme,
) => {
  Object.entries(themeStyles[mode]).forEach(([key, value]) => {
    if (
      typeof value === "string" &&
      !COMMON_NON_COLOR_KEYS.includes(
        key as (typeof COMMON_NON_COLOR_KEYS)[number],
      )
    ) {
      const hslValue = colorFormatter(value, "hsl", "4");
      applyStyleToElement(root, key, hslValue);
    }
  });
};

// Exported function to apply theme styles to an element
export const applyThemeToElement = (
  themeState: ThemeEditorState,
  rootElement: HTMLElement,
) => {
  const { currentMode: mode, styles: themeStyles } = themeState;

  if (!rootElement) return;

  updateThemeClass(rootElement, mode);
  // Apply common styles (like border-radius) based on the 'light' mode definition
  applyCommonStyles(rootElement, themeStyles.light);
  // Apply mode-specific colors
  applyThemeColors(rootElement, themeStyles, mode);
  // Apply shadow variables
  setShadowVariables(themeState);
};

// Ensure global is available as early as possible for render-blocking consumers
if (typeof window !== "undefined") {
  // Preserve any existing namespace
  (window as any).bejamas = (window as any).bejamas || {};
  (window as any).bejamas.applyThemeToElement = applyThemeToElement;
}

// Generate full CSS text for the provided theme styles
export function applyThemeToCss(themeState: ThemeEditorState): string {
  const buildCssVars = (vars: Record<string, string>): string => {
    return Object.entries(vars)
      .map(([key, value]) => `  --${key}: ${value};`)
      .join("\n");
  };

  const buildColorVars = (styles: ThemeStyleProps): Record<string, string> => {
    const out: Record<string, string> = {};
    Object.entries(styles).forEach(([key, value]) => {
      const isCommon = COMMON_NON_COLOR_KEYS.includes(
        key as (typeof COMMON_NON_COLOR_KEYS)[number],
      );
      if (isCommon) return;
      if (typeof value === "string") {
        out[`${key}`] = colorFormatter(value, "hsl", "4");
      }
    });
    return out;
  };

  // Common variables (non-color) come from light by convention
  const commonVars: Record<string, string> = {};
  Object.entries(themeState.styles.light).forEach(([key, value]) => {
    const isCommon = COMMON_NON_COLOR_KEYS.includes(
      key as (typeof COMMON_NON_COLOR_KEYS)[number],
    );
    if (!isCommon) return;
    if (typeof value === "string") {
      commonVars[key] = value;
    }
  });

  // Color variables for each mode
  const lightColorVars = buildColorVars(themeState.styles.light);
  const darkColorVars = buildColorVars(themeState.styles.dark);

  // Shadow variables for each mode
  const lightShadows = getShadowMap({ ...themeState, currentMode: "light" });
  const darkShadows = getShadowMap({ ...themeState, currentMode: "dark" });

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
