import { setStoredPreset } from "./preset-store";
import type { ThemeSwatches } from "./theme-cookie";

export interface ApplyDocsPresetOptions {
  id: string;
  label: string;
  swatches: ThemeSwatches;
  themeRef?: string | null;
}

export function refreshCurrentThemeStylesheet() {
  const stylesheet = document.querySelector<HTMLLinkElement>(
    "link[data-current-theme-stylesheet]",
  );

  if (!stylesheet) {
    return;
  }

  const url = new URL(stylesheet.href, window.location.origin);
  url.searchParams.set("v", Date.now().toString());
  stylesheet.href = `${url.pathname}${url.search}`;
}

export function applyDocsPreset(options: ApplyDocsPresetOptions) {
  setStoredPreset(
    options.id,
    options.swatches,
    options.label,
    options.themeRef ?? null,
  );

  refreshCurrentThemeStylesheet();
}
