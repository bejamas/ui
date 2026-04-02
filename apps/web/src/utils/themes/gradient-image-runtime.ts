import {
  decodePreset,
  isPresetCode,
  type DesignSystemConfig,
} from "@bejamas/create-config/browser";
import { getCreateThemeImagePreset } from "./create-theme";

const OPTIMIZER_PATHS = new Set(["/_vercel/image", "/_image"]);
const GRADIENT_IMAGE_SWAP_DURATION_MS = 320;
const GRADIENT_IMAGE_SWAP_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

const imageSwapAnimations = new WeakMap<HTMLImageElement, Animation>();
const imageSwapTokens = new WeakMap<HTMLImageElement, number>();

type RewriteOptions = {
  theme: string | null | undefined;
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

function getOptimizerNestedParamKey(url: URL): "url" | "href" | null {
  if (!OPTIMIZER_PATHS.has(url.pathname)) {
    return null;
  }

  if (url.searchParams.has("url")) {
    return "url";
  }

  if (url.searchParams.has("href")) {
    return "href";
  }

  return null;
}

function prefersReducedMotion(): boolean {
  return Boolean(
    typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
}

function getFirstSrcsetUrl(srcset: string | null): string | null {
  if (!srcset) {
    return null;
  }

  const firstEntry = srcset.split(",")[0]?.trim();
  if (!firstEntry) {
    return null;
  }

  return firstEntry.split(/\s+/)[0] ?? null;
}

function clearImageSwapAnimation(image: HTMLImageElement): void {
  const currentAnimation = imageSwapAnimations.get(image);
  if (currentAnimation) {
    currentAnimation.cancel();
    imageSwapAnimations.delete(image);
  }

  image.style.removeProperty("will-change");
}

function setImageAttributes(
  image: HTMLImageElement,
  next: {
    src: string | null;
    srcset: string | null;
  },
): void {
  if (next.srcset !== null) {
    image.setAttribute("srcset", next.srcset);
  }

  if (next.src !== null) {
    image.setAttribute("src", next.src);
  }
}

function shouldAnimateImageSwap(image: HTMLImageElement): boolean {
  return Boolean(
    typeof document !== "undefined" &&
      typeof Image !== "undefined" &&
      typeof image.animate === "function" &&
      document.visibilityState !== "hidden" &&
      !prefersReducedMotion(),
  );
}

function preloadImage(url: string | null): Promise<void> {
  if (!url || typeof Image === "undefined") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const preloader = new Image();
    let settled = false;

    const settle = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve();
    };

    preloader.addEventListener("load", settle, { once: true });
    preloader.addEventListener("error", settle, { once: true });
    preloader.decoding = "async";
    preloader.src = url;

    if (preloader.complete) {
      settle();
    }
  });
}

async function animateImageSwap(
  image: HTMLImageElement,
  next: {
    src: string | null;
    srcset: string | null;
  },
): Promise<void> {
  const token = (imageSwapTokens.get(image) ?? 0) + 1;
  imageSwapTokens.set(image, token);

  await preloadImage(next.src ?? getFirstSrcsetUrl(next.srcset));

  if (imageSwapTokens.get(image) !== token) {
    return;
  }

  setImageAttributes(image, next);

  if (imageSwapTokens.get(image) !== token) {
    return;
  }

  clearImageSwapAnimation(image);
  image.style.setProperty("will-change", "opacity, transform, filter");

  const animation = image.animate(
    [
      {
        opacity: 0.58,
        transform: "scale(1.018)",
        filter: "blur(10px) saturate(0.88)",
      },
      {
        opacity: 1,
        transform: "scale(1)",
        filter: "blur(0px) saturate(1)",
      },
    ],
    {
      duration: GRADIENT_IMAGE_SWAP_DURATION_MS,
      easing: GRADIENT_IMAGE_SWAP_EASING,
    },
  );

  imageSwapAnimations.set(image, animation);

  const cleanup = () => {
    if (imageSwapAnimations.get(image) === animation) {
      imageSwapAnimations.delete(image);
    }

    if (imageSwapTokens.get(image) === token) {
      image.style.removeProperty("will-change");
    }
  };

  animation.addEventListener("finish", cleanup, { once: true });
  animation.addEventListener("cancel", cleanup, { once: true });
}

export function resolveGradientThemeFromPresetId(
  presetId: string | null | undefined,
): DesignSystemConfig["theme"] | null {
  if (!presetId || !isPresetCode(presetId)) {
    return null;
  }

  return decodePreset(presetId)?.theme ?? null;
}

function rewriteInnerGradientUrl(url: URL, { theme }: RewriteOptions): boolean {
  if (!theme || !isGradientHost(url)) {
    return false;
  }

  const presetImage = getCreateThemeImagePreset(theme);
  if (!presetImage) {
    return false;
  }

  const nextUrl = new URL(presetImage.url);
  const changed =
    url.pathname !== nextUrl.pathname ||
    url.search !== nextUrl.search ||
    url.hash !== nextUrl.hash;

  if (!changed) {
    return false;
  }

  url.pathname = nextUrl.pathname;
  url.search = nextUrl.search;
  url.hash = nextUrl.hash;
  return true;
}

export function rewriteGradientImageUrl(
  rawUrl: string,
  options: RewriteOptions,
): string {
  const url = toUrl(rawUrl);
  if (!url) return rawUrl;

  const optimizerParam = getOptimizerNestedParamKey(url);
  if (optimizerParam) {
    const nestedUrl = toUrl(url.searchParams.get(optimizerParam) || "");
    if (!nestedUrl) return rawUrl;

    const changed = rewriteInnerGradientUrl(nestedUrl, options);
    if (!changed) return rawUrl;

    url.searchParams.set(optimizerParam, nestedUrl.toString());
    return formatLikeInput(url, rawUrl);
  }

  const changed = rewriteInnerGradientUrl(url, options);
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

function updateSourceElement(
  element: HTMLSourceElement,
  options: RewriteOptions,
): void {
  const current = element.getAttribute("srcset");
  if (!current) {
    return;
  }

  const next = rewriteGradientSrcset(current, options);
  if (next !== current) {
    element.setAttribute("srcset", next);
  }
}

function updateImageElement(
  image: HTMLImageElement,
  options: RewriteOptions,
): void {
  const currentSrc = image.getAttribute("src");
  const currentSrcset = image.getAttribute("srcset");
  const nextSrc = currentSrc ? rewriteGradientImageUrl(currentSrc, options) : null;
  const nextSrcset = currentSrcset
    ? rewriteGradientSrcset(currentSrcset, options)
    : null;

  if (nextSrc === currentSrc && nextSrcset === currentSrcset) {
    return;
  }

  const next = {
    src: nextSrc !== currentSrc ? nextSrc : null,
    srcset: nextSrcset !== currentSrcset ? nextSrcset : null,
  };

  if (!shouldAnimateImageSwap(image)) {
    clearImageSwapAnimation(image);
    setImageAttributes(image, next);
    return;
  }

  void animateImageSwap(image, next);
}

export function syncGradientImages({ theme, root }: SyncOptions): void {
  if (!theme || typeof document === "undefined") return;

  const scope = root ?? document;
  scope.querySelectorAll("img").forEach((image) => {
    updateImageElement(image, { theme });
  });

  scope.querySelectorAll("source").forEach((source) => {
    updateSourceElement(source, { theme });
  });
}
