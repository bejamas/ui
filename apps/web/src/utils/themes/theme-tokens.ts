import type { ThemeStyleProps } from "../types/theme";
import { colorFormatter } from "./color-converter";

export const COMMON_NON_COLOR_KEYS = [
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
] as const satisfies ReadonlyArray<keyof ThemeStyleProps>;

type CommonNonColorKey = (typeof COMMON_NON_COLOR_KEYS)[number];

function isCommonNonColorKey(key: string): key is CommonNonColorKey {
  return (COMMON_NON_COLOR_KEYS as readonly string[]).includes(key);
}

export function isThemeColorToken(key: string) {
  return !isCommonNonColorKey(key);
}

export function normalizeThemeTokenValue(key: string, value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return normalizedValue;
  }

  if (!isThemeColorToken(key)) {
    return normalizedValue;
  }

  return colorFormatter(normalizedValue, "oklch");
}

export function normalizeThemeTokenMap<T extends Record<string, string>>(
  tokens: Partial<T> | null | undefined,
): Partial<T> {
  const normalized: Partial<T> = {};

  for (const [key, value] of Object.entries(tokens ?? {})) {
    if (typeof value !== "string") {
      continue;
    }

    normalized[key as keyof T] = normalizeThemeTokenValue(
      key,
      value,
    ) as T[keyof T];
  }

  return normalized;
}
