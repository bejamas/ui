import { isPresetCode } from "@bejamas/create-config/browser";
import type { ThemeStyles } from "../types/theme";
import type { ParsedThemeCookie } from "./theme-cookie";
import {
  buildCreateHref,
  getSwatchesFromStyles,
  type HeaderPresetOption,
  type HeaderPresetSummary,
} from "./header-preset-summary";

export const HEADER_CUSTOM_PRESET_STORAGE_KEY = "bejamas-header-custom-preset";
export const HEADER_CUSTOM_PRESET_VALUE = "custom-preset";
export const HEADER_CUSTOM_PRESET_LABEL = "Custom Preset";

export type StoredHeaderCustomPreset = {
  id: string;
  styles: ThemeStyles;
  themeRef: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isThemeStyles(value: unknown): value is ThemeStyles {
  return isRecord(value) && isRecord(value.light) && isRecord(value.dark);
}

export function buildHeaderCustomPreset(
  stored: StoredHeaderCustomPreset,
): HeaderPresetOption | null {
  if (
    !isPresetCode(stored.id) ||
    !isThemeStyles(stored.styles) ||
    (stored.themeRef !== null && typeof stored.themeRef !== "string")
  ) {
    return null;
  }

  return {
    id: stored.id,
    label: HEADER_CUSTOM_PRESET_LABEL,
    swatches: getSwatchesFromStyles(stored.styles),
    createHref: buildCreateHref(stored.id, stored.themeRef),
    themeRef: stored.themeRef,
    styles: stored.styles,
  };
}

export function getHeaderCustomPreset(): HeaderPresetOption | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(HEADER_CUSTOM_PRESET_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as StoredHeaderCustomPreset;
    return buildHeaderCustomPreset(parsed);
  } catch {
    return null;
  }
}

export function setHeaderCustomPreset(
  preset: StoredHeaderCustomPreset,
): HeaderPresetOption | null {
  const resolved = buildHeaderCustomPreset(preset);
  if (!resolved || typeof localStorage === "undefined") {
    return resolved;
  }

  try {
    localStorage.setItem(
      HEADER_CUSTOM_PRESET_STORAGE_KEY,
      JSON.stringify({
        id: resolved.id,
        styles: resolved.styles,
        themeRef: resolved.themeRef,
      } satisfies StoredHeaderCustomPreset),
    );
  } catch {}

  return resolved;
}

export function isHeaderCustomPresetActive(options: {
  preset: HeaderPresetOption | null;
  stored: ParsedThemeCookie | null;
  themeRef: string | null;
}) {
  const { preset, stored, themeRef } = options;
  if (
    !preset ||
    !stored ||
    stored.id !== preset.id ||
    themeRef !== preset.themeRef
  ) {
    return false;
  }

  return Boolean(themeRef) || stored.name === HEADER_CUSTOM_PRESET_LABEL;
}

export function getHeaderCustomPresetSummary(
  preset: HeaderPresetOption,
): HeaderPresetSummary {
  return {
    id: preset.id,
    label: preset.label,
    swatches: preset.swatches,
    createHref: preset.createHref,
    themeRef: preset.themeRef,
  };
}
