export const PRESET_COOKIE_NAME = "theme";
export const PRESET_STORAGE_KEY = "theme-preset";
export const PRESET_CHANGE_EVENT = "bejamas:preset-change";
const PRESET_COOKIE_DOMAIN = ".bejamas.com";

// Cookie format: theme={id}|{primaryLight}|{accentLight}|{primaryDark}|{accentDark}|{name}
// Example: theme=custom-abc|oklch(0.2 0.04 250)|oklch(0.6 0.23 250)|oklch(0.97 0 0)|oklch(0.6 0.23 250)|My Theme

export interface ThemeSwatches {
  primaryLight: string;
  accentLight: string;
  primaryDark: string;
  accentDark: string;
}

export interface ParsedThemeCookie {
  id: string;
  swatches?: ThemeSwatches;
  name?: string;
}

/**
 * Parse the theme cookie value into id, swatches, and name
 */
export function parseThemeCookie(cookieValue: string): ParsedThemeCookie {
  const parts = cookieValue.split("|");
  const id = parts[0];

  if (parts.length >= 5) {
    return {
      id,
      swatches: {
        primaryLight: parts[1],
        accentLight: parts[2],
        primaryDark: parts[3],
        accentDark: parts[4],
      },
      name: parts[5] || undefined, // 6th part is the name
    };
  }

  return { id };
}

/**
 * Encode theme id, swatches, and name into cookie value
 */
export function encodeThemeCookie(
  id: string,
  swatches?: ThemeSwatches,
  name?: string
): string {
  if (!swatches) return id;
  const base = `${id}|${swatches.primaryLight}|${swatches.accentLight}|${swatches.primaryDark}|${swatches.accentDark}`;
  return name ? `${base}|${name}` : base;
}

function getCookieAttributes(): string {
  if (typeof document === "undefined" || typeof location === "undefined") {
    return "path=/; SameSite=Lax";
  }

  const attributes = ["path=/", "SameSite=Lax"];

  if (location.protocol === "https:") {
    attributes.push("Secure");
  }

  if (location.hostname.endsWith("bejamas.com")) {
    attributes.push(`Domain=${PRESET_COOKIE_DOMAIN}`);
  }

  return attributes.join("; ");
}

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
  document.cookie = `${PRESET_COOKIE_NAME}=${encodeURIComponent(cookieValue)}; ${getCookieAttributes()};`;
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, key);
  } catch {}
  window.dispatchEvent(
    new CustomEvent(PRESET_CHANGE_EVENT, { detail: { key, swatches, name } })
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
