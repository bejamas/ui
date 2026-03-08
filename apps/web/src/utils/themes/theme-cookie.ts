export const PRESET_COOKIE_NAME = "theme";
const PRESET_COOKIE_DOMAIN = ".bejamas.com";

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

// Cookie format: theme={id}|{primaryLight}|{accentLight}|{primaryDark}|{accentDark}|{name}
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
      name: parts[5] || undefined,
    };
  }

  return { id };
}

export function encodeThemeCookie(
  id: string,
  swatches?: ThemeSwatches,
  name?: string,
): string {
  if (!swatches) {
    return id;
  }

  const base = `${id}|${swatches.primaryLight}|${swatches.accentLight}|${swatches.primaryDark}|${swatches.accentDark}`;
  return name ? `${base}|${name}` : base;
}

export function getThemeCookieAttributes() {
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
