import * as culori from "culori";

type ThemeMode = "light" | "dark";

const OPTIMIZER_PATHS = new Set(["/_vercel/image", "/_image"]);

type RewriteOptions = {
  themeKey: string;
  mode: ThemeMode;
  color?: string;
};

type SyncOptions = RewriteOptions & {
  root?: ParentNode;
};

function toUrl(rawUrl: string): URL | null {
  try {
    const base =
      typeof window !== "undefined" && window.location?.href
        ? window.location.href
        : "http://localhost";
    return new URL(rawUrl, base);
  } catch {
    return null;
  }
}

function isGradientHost(url: URL): boolean {
  return url.hostname === "gradient.bejamas.com";
}

function formatLikeInput(url: URL, rawUrl: string): string {
  if (rawUrl.startsWith("//")) {
    return `//${url.host}${url.pathname}${url.search}${url.hash}`;
  }
  if (rawUrl.startsWith("/")) {
    return `${url.pathname}${url.search}${url.hash}`;
  }
  return url.toString();
}

function rewriteInnerGradientUrl(
  url: URL,
  { themeKey, mode, color }: RewriteOptions,
): boolean {
  if (!isGradientHost(url)) return false;

  let changed = false;
  if (url.searchParams.get("theme") !== themeKey) {
    url.searchParams.set("theme", themeKey);
    changed = true;
  }
  if (url.searchParams.get("mode") !== mode) {
    url.searchParams.set("mode", mode);
    changed = true;
  }

  if (color && url.searchParams.get("color") !== color) {
    url.searchParams.set("color", color);
    changed = true;
  }
  return changed;
}

function resolveGradientColor(inputColor?: string): string | undefined {
  const normalizeToHex = (value?: string): string | undefined => {
    if (!value || !value.trim()) return undefined;
    const parsed = culori.parse(value.trim());
    if (!parsed) return undefined;
    return culori.formatHex(parsed);
  };

  const explicitColor = normalizeToHex(inputColor);
  if (explicitColor) return explicitColor;
  if (typeof document === "undefined") return undefined;

  const root = document.documentElement;
  if (!root) return undefined;

  const cssVar = getComputedStyle(root).getPropertyValue("--primary").trim();
  return normalizeToHex(cssVar);
}

export function rewriteGradientImageUrl(
  rawUrl: string,
  options: RewriteOptions,
): string {
  const normalizedOptions = {
    ...options,
    color: resolveGradientColor(options.color),
  };
  const url = toUrl(rawUrl);
  if (!url) return rawUrl;

  if (OPTIMIZER_PATHS.has(url.pathname) && url.searchParams.has("url")) {
    const nestedUrl = toUrl(url.searchParams.get("url") || "");
    if (!nestedUrl) return rawUrl;

    const changed = rewriteInnerGradientUrl(nestedUrl, normalizedOptions);
    if (!changed) return rawUrl;

    url.searchParams.set("url", nestedUrl.toString());
    return formatLikeInput(url, rawUrl);
  }

  const changed = rewriteInnerGradientUrl(url, normalizedOptions);
  if (!changed) return rawUrl;
  return formatLikeInput(url, rawUrl);
}

export function rewriteGradientSrcset(
  srcset: string,
  options: RewriteOptions,
): string {
  if (!srcset) return srcset;

  return srcset
    .split(",")
    .map((entry) => {
      const parts = entry.trim().split(/\s+/);
      if (parts.length === 0 || !parts[0]) return entry;
      const nextUrl = rewriteGradientImageUrl(parts[0], options);
      if (parts.length === 1) return nextUrl;
      return `${nextUrl} ${parts.slice(1).join(" ")}`;
    })
    .join(", ");
}

function updateUrlAttribute(
  element: HTMLImageElement | HTMLSourceElement,
  attr: "src" | "srcset",
  options: RewriteOptions,
): void {
  const current = element.getAttribute(attr);
  if (!current) return;

  const next =
    attr === "src"
      ? rewriteGradientImageUrl(current, options)
      : rewriteGradientSrcset(current, options);

  if (next !== current) {
    element.setAttribute(attr, next);
  }
}

export function syncGradientImages({
  themeKey,
  mode,
  root,
}: SyncOptions): void {
  if (!themeKey || typeof document === "undefined") return;

  const scope = root ?? document;
  scope.querySelectorAll("img").forEach((image) => {
    updateUrlAttribute(image, "src", { themeKey, mode });
    updateUrlAttribute(image, "srcset", { themeKey, mode });
  });

  scope.querySelectorAll("source").forEach((source) => {
    updateUrlAttribute(source, "srcset", { themeKey, mode });
  });
}
