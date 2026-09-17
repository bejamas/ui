import {
  decodePreset,
  isPresetCode,
  isSharedShadcnStyle,
  type DesignSystemConfig,
} from "@bejamas/create-config/browser";
import { PRESET_CHANGE_EVENT, setStoredPreset } from "./preset-store";
import type { ThemeSwatches } from "./theme-cookie";
import type { ThemeStyles } from "../types/theme";
import { resolveDesignSystemTheme } from "./design-system-adapter";
import { applyThemeToCss } from "./apply-theme";

export interface ApplyDocsPresetOptions {
  id: string;
  label: string;
  swatches: ThemeSwatches;
  themeRef?: string | null;
  styles?: ThemeStyles;
}

function resolveConfigFromPresetId(id: string): DesignSystemConfig | null {
  if (!isPresetCode(id)) {
    return null;
  }

  const decoded = decodePreset(id);
  if (!decoded) {
    return null;
  }

  return {
    ...decoded,
    template: "astro",
    rtl: false,
    rtlLanguage: "ar",
  };
}

const DOCUMENT_THEME_SELECTOR = "style[data-docs-preset-theme]";

/** Keep both modes in CSS so changing the mode never leaves light colors inline. */
export function applyThemeToDocument(id: string, styles?: ThemeStyles) {
  if (typeof document === "undefined") return;

  const config = resolveConfigFromPresetId(id);
  const resolvedStyles =
    styles ?? (config && resolveDesignSystemTheme(config).styles);
  if (!resolvedStyles) return;

  const css = applyThemeToCss(
    { styles: resolvedStyles, currentMode: "light" },
    {
      includeGeneratedShadows: config
        ? !isSharedShadcnStyle(config.style)
        : true,
    },
  );
  const stylesheet =
    document.querySelector<HTMLStyleElement>(DOCUMENT_THEME_SELECTOR) ??
    document.createElement("style");
  stylesheet.setAttribute("data-docs-preset-theme", "");
  stylesheet.textContent = css;
  document.head.appendChild(stylesheet);

  // Earlier legacy previews wrote these tokens inline, above every stylesheet.
  for (const match of css.matchAll(/--([\w-]+):/g)) {
    document.documentElement.style.removeProperty(`--${match[1]}`);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener(PRESET_CHANGE_EVENT, () => {
    document.querySelector(DOCUMENT_THEME_SELECTOR)?.remove();
  });
}

export function applyDocsPreset(options: ApplyDocsPresetOptions) {
  setStoredPreset(
    options.id,
    options.swatches,
    options.label,
    options.themeRef ?? null,
    options.styles,
  );

  applyThemeToDocument(options.id, options.styles);
}
