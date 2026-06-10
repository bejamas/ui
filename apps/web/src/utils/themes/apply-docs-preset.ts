import {
  decodePreset,
  isPresetCode,
  isSharedShadcnStyle,
  type DesignSystemConfig,
} from "@bejamas/create-config/browser";
import { getCurrentMode, setStoredPreset } from "./preset-store";
import type { ThemeSwatches } from "./theme-cookie";
import { resolveDesignSystemTheme } from "./design-system-adapter";
import { applyThemeToElement } from "./apply-theme";

export interface ApplyDocsPresetOptions {
  id: string;
  label: string;
  swatches: ThemeSwatches;
  themeRef?: string | null;
}

const PENDING_THEME_STYLESHEET_SELECTOR =
  "link[data-pending-current-theme-stylesheet]";

let stylesheetSwapToken = 0;
let stylesheetVersionCounter = 0;
let cancelPendingThemeStylesheetSwap: (() => void) | null = null;

function getAnimationFrame() {
  if (typeof window !== "undefined" && window.requestAnimationFrame) {
    return window.requestAnimationFrame.bind(window);
  }

  return (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0);
}

export function refreshCurrentThemeStylesheet() {
  const currentStylesheet = document.querySelector<HTMLLinkElement>(
    "link[data-current-theme-stylesheet]",
  );

  if (!currentStylesheet) {
    return Promise.resolve();
  }

  cancelPendingThemeStylesheetSwap?.();

  const url = new URL(currentStylesheet.href, window.location.origin);
  // Strictly-monotonic version so two refreshes in the same millisecond can
  // never collide on a cached response (which would swap in a stale theme).
  url.searchParams.set("v", `${Date.now()}-${++stylesheetVersionCounter}`);
  const nextStylesheet = currentStylesheet.cloneNode(true) as HTMLLinkElement;
  const nextHref = `${url.pathname}${url.search}`;
  const swapToken = ++stylesheetSwapToken;
  const requestAnimationFrame = getAnimationFrame();

  nextStylesheet.href = nextHref;
  nextStylesheet.removeAttribute("data-current-theme-stylesheet");
  nextStylesheet.setAttribute("data-pending-current-theme-stylesheet", "");

  document
    .querySelectorAll<HTMLLinkElement>(PENDING_THEME_STYLESHEET_SELECTOR)
    .forEach((link) => {
      if (link !== nextStylesheet) {
        link.remove();
      }
    });

  currentStylesheet.insertAdjacentElement("afterend", nextStylesheet);

  return new Promise<void>((resolve) => {
    let settled = false;

    const settle = () => {
      if (settled) {
        return;
      }

      settled = true;
      if (cancelPendingThemeStylesheetSwap === cancel) {
        cancelPendingThemeStylesheetSwap = null;
      }
      resolve();
    };

    const cleanup = () => {
      nextStylesheet.removeEventListener("load", onLoad);
      nextStylesheet.removeEventListener("error", onError);
    };

    const cancel = () => {
      cleanup();
      nextStylesheet.remove();
      settle();
    };

    const onError = () => {
      cancel();
    };

    const onLoad = () => {
      cleanup();

      if (swapToken !== stylesheetSwapToken) {
        nextStylesheet.remove();
        settle();
        return;
      }

      currentStylesheet.removeAttribute("data-current-theme-stylesheet");
      nextStylesheet.removeAttribute("data-pending-current-theme-stylesheet");
      nextStylesheet.setAttribute("data-current-theme-stylesheet", "");

      requestAnimationFrame(() => {
        if (swapToken === stylesheetSwapToken) {
          currentStylesheet.remove();
        }

        settle();
      });
    };

    cancelPendingThemeStylesheetSwap = cancel;
    nextStylesheet.addEventListener("load", onLoad, { once: true });
    nextStylesheet.addEventListener("error", onError, { once: true });
  });
}

function resolveConfigFromPresetId(id: string): DesignSystemConfig | null {
  if (!isPresetCode(id)) {
    return null;
  }

  const decoded = decodePreset(id);
  if (!decoded) {
    return null;
  }

  return {
    ...decoded,
    template: "astro",
    rtl: false,
    rtlLanguage: "ar",
  } as DesignSystemConfig;
}

/**
 * Apply the theme synchronously by writing its CSS variables as an inline
 * style on <html> via applyThemeToElement — the same authoritative layer the
 * page bootstrap and the other preset switchers write to.
 *
 * This is required (not just a nicety): an element's inline style outranks any
 * <link>/<style> rule, so the runtime theme stylesheet swap alone can never win
 * against the inline vars the bootstrap sets on load. Updating this layer is
 * what actually changes the visible theme. The network stylesheet refresh still
 * runs afterwards to pick up the server-only per-style global CSS (component
 * styling that isn't expressible as plain CSS variables).
 */
export function applyThemeToDocument(id: string) {
  if (typeof document === "undefined") {
    return;
  }

  const config = resolveConfigFromPresetId(id);
  if (!config) {
    return;
  }

  const { styles } = resolveDesignSystemTheme(config);

  applyThemeToElement(
    { styles, currentMode: getCurrentMode() },
    document.documentElement,
    {
      // ThemeProvider owns the light/dark class; don't fight it here.
      skipModeClass: true,
      includeGeneratedShadows: !isSharedShadcnStyle(config.style),
    },
  );
}

export function applyDocsPreset(options: ApplyDocsPresetOptions) {
  setStoredPreset(
    options.id,
    options.swatches,
    options.label,
    options.themeRef ?? null,
  );

  applyThemeToDocument(options.id);

  return refreshCurrentThemeStylesheet();
}
