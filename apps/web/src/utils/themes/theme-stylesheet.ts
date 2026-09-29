import { PRESET_COOKIE_NAME, THEME_REF_COOKIE_NAME } from "./theme-cookie";

/**
 * Preview pages are prerendered, so `/r/themes/current-theme.css` resolves the
 * theme from cookies on each request. Versioning its URL with those cookies
 * gives every theme its own cache entry and lets a page swap themes live.
 */
export const THEME_STYLESHEET_ATTRIBUTE = "data-theme-stylesheet";
export const THEME_STYLESHEET_SELECTOR = `link[${THEME_STYLESHEET_ATTRIBUTE}]`;
/** Posted by a page to its preview iframes after the preset changes. */
export const PRESET_CHANGE_MESSAGE = "bejamas:preset-change";

const VERSION_COOKIES = [PRESET_COOKIE_NAME, THEME_REF_COOKIE_NAME];

function readCookie(cookie: string, name: string) {
  for (const entry of cookie.split(";")) {
    const separator = entry.indexOf("=");
    if (separator !== -1 && entry.slice(0, separator).trim() === name) {
      return entry.slice(separator + 1);
    }
  }
  return "";
}

/** Only the cookies the theme endpoint reads decide the version. */
export function getThemeStylesheetHref(base: string, cookie: string) {
  const version = VERSION_COOKIES.map((name) => readCookie(cookie, name)).join(
    "|",
  );
  return `${base}?v=${encodeURIComponent(version)}`;
}

/**
 * Inline script that writes the stylesheet link with the versioned URL before
 * first paint. It must be self-contained, so it mirrors
 * `getThemeStylesheetHref`; the tests keep the two in step.
 */
export function buildThemeStylesheetInlineScript(base: string) {
  return `(function () {
  var names = ${JSON.stringify(VERSION_COOKIES)};
  var entries = document.cookie.split(";");
  var version = names.map(function (name) {
    for (var i = 0; i < entries.length; i++) {
      var separator = entries[i].indexOf("=");
      if (separator !== -1 && entries[i].slice(0, separator).trim() === name) {
        return entries[i].slice(separator + 1);
      }
    }
    return "";
  }).join("|");
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.setAttribute(${JSON.stringify(THEME_STYLESHEET_ATTRIBUTE)}, ${JSON.stringify(base)});
  link.href = ${JSON.stringify(base)} + "?v=" + encodeURIComponent(version);
  document.currentScript.replaceWith(link);
})();`;
}

/**
 * Load the stylesheet for the current cookies, then drop the previous one so
 * the page never renders without theme styles. No-op when nothing changed.
 */
export function refreshThemeStylesheet(doc: Document = document) {
  const links = doc.querySelectorAll<HTMLLinkElement>(THEME_STYLESHEET_SELECTOR);
  const latest = links[links.length - 1];
  const base = latest?.getAttribute(THEME_STYLESHEET_ATTRIBUTE);
  if (!latest || !base) return;

  const href = getThemeStylesheetHref(base, doc.cookie);
  if (latest.getAttribute("href") === href) return;

  const next = latest.cloneNode() as HTMLLinkElement;
  next.href = href;
  next.addEventListener(
    "load",
    () => {
      // A newer refresh already replaced this one.
      if (!next.isConnected) return;
      for (const link of doc.querySelectorAll(THEME_STYLESHEET_SELECTOR)) {
        if (link === next) break;
        link.remove();
      }
    },
    { once: true },
  );
  // Keep the working stylesheet if the new one cannot load.
  next.addEventListener("error", () => next.remove(), { once: true });
  latest.after(next);
}
