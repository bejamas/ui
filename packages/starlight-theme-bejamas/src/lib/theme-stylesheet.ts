export const CURRENT_THEME_STYLESHEET_SELECTOR =
  'link[data-current-theme-stylesheet]';

export function buildCurrentThemeStylesheetHref(
  href: string,
  version: string | number,
) {
  const url = new URL(href, "https://ui.bejamas.com");
  url.searchParams.set("v", String(version));

  const isAbsolute = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href);
  return isAbsolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
}
