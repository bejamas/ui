export const PRESET_COOKIE_NAME = "theme";
export const PRESET_STORAGE_KEY = "theme-preset";
export const PRESET_CHANGE_EVENT = "bejamas:preset-change";

/**
 * Get the stored preset key from cookie (priority) or localStorage (fallback)
 */
export function getStoredPreset(): string | null {
  if (typeof document === "undefined") return null;

  // Cookie takes priority
  const match = document.cookie.match(/(?:^|;)\s*theme=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);

  // Fallback to localStorage
  try {
    return localStorage.getItem(PRESET_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Store the preset key in cookie and localStorage, then dispatch sync event
 */
export function setStoredPreset(key: string): void {
  if (typeof document === "undefined") return;

  document.cookie = `${PRESET_COOKIE_NAME}=${encodeURIComponent(key)}; path=/;`;
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, key);
  } catch {}
  window.dispatchEvent(
    new CustomEvent(PRESET_CHANGE_EVENT, { detail: { key } })
  );
}

/**
 * Get the current theme mode (light/dark) from the document
 */
export function getCurrentMode(): "light" | "dark" {
  if (typeof window === "undefined") return "light";

  if ((window as any).astroThemeToggle?.getTheme) {
    return (window as any).astroThemeToggle.getTheme();
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
  (window as any).bejamas.setPreset = setStoredPreset;
  (window as any).bejamas.getCurrentMode = getCurrentMode;
  (window as any).bejamas.PRESET_CHANGE_EVENT = PRESET_CHANGE_EVENT;
}
