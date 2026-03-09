import { decodePreset, isPresetCode } from "@bejamas/create-config/browser";
import {
  encodeThemeCookie,
  getThemeCookieAttributes,
  parseThemeCookie,
  PRESET_COOKIE_NAME,
  type ParsedThemeCookie,
  type ThemeSwatches,
} from "./theme-cookie";

export const PRESET_STORAGE_KEY = "theme-preset";
export const PRESET_CHANGE_EVENT = "bejamas:preset-change";

export {
  encodeThemeCookie,
  parseThemeCookie,
  PRESET_COOKIE_NAME,
  type ParsedThemeCookie,
  type ThemeSwatches,
} from "./theme-cookie";

/**
 * Get the stored preset key from cookie (priority) or localStorage (fallback)
 */
export function getStoredPreset(): string | null {
  if (typeof document === "undefined") return null;

  // Cookie takes priority
  const match = document.cookie.match(/(?:^|;)\s*theme=([^;]+)/);
  if (match) {
    const decoded = decodeURIComponent(match[1]);
    // Extract just the ID part (before any pipe)
    return parseThemeCookie(decoded).id;
  }

  // Fallback to localStorage
  try {
    return localStorage.getItem(PRESET_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Get parsed theme cookie with swatches
 */
export function getStoredPresetWithSwatches(): ParsedThemeCookie | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(/(?:^|;)\s*theme=([^;]+)/);
  if (match) {
    const decoded = decodeURIComponent(match[1]);
    return parseThemeCookie(decoded);
  }

  // Fallback to localStorage (no swatches stored there)
  try {
    const id = localStorage.getItem(PRESET_STORAGE_KEY);
    return id ? { id } : null;
  } catch {
    return null;
  }
}

/**
 * Store the preset key in cookie and localStorage, then dispatch sync event
 * Optionally includes swatches and name for initial render
 */
export function setStoredPreset(key: string, swatches?: ThemeSwatches, name?: string): void {
  if (typeof document === "undefined") return;

  const cookieValue = encodeThemeCookie(key, swatches, name);
  const designSystemPreset = isPresetCode(key) ? decodePreset(key) : null;
  document.cookie = `${PRESET_COOKIE_NAME}=${encodeURIComponent(cookieValue)}; ${getThemeCookieAttributes()};`;
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, key);
  } catch {}
  window.dispatchEvent(
    new CustomEvent(PRESET_CHANGE_EVENT, {
      detail: {
        key,
        swatches,
        name,
        preset: designSystemPreset ?? undefined,
        iconLibrary: designSystemPreset?.iconLibrary,
      },
    })
  );
}

/**
 * Get the current theme mode (light/dark) from the document
 */
export function getCurrentMode(): "light" | "dark" {
  if (typeof window === "undefined") return "light";

  if ((window as any).astroThemeToggle?.getTheme) {
    const mode = (window as any).astroThemeToggle.getTheme();
    if (mode === "dark" || mode === "light") return mode;
  }
  const el = document.documentElement;
  const attr = el.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  return el.classList.contains("dark") ? "dark" : "light";
}

// Expose globally for inline scripts and Alpine.js
if (typeof window !== "undefined") {
  (window as any).bejamas = (window as any).bejamas || {};
  (window as any).bejamas.getPreset = getStoredPreset;
  (window as any).bejamas.getPresetWithSwatches = getStoredPresetWithSwatches;
  (window as any).bejamas.setPreset = setStoredPreset;
  (window as any).bejamas.getCurrentMode = getCurrentMode;
  (window as any).bejamas.PRESET_CHANGE_EVENT = PRESET_CHANGE_EVENT;
  (window as any).bejamas.parseThemeCookie = parseThemeCookie;
  (window as any).bejamas.encodeThemeCookie = encodeThemeCookie;
}
