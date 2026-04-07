import { setStoredPreset } from "./preset-store";
import type { ThemeSwatches } from "./theme-cookie";

export interface ApplyDocsPresetOptions {
  id: string;
  label: string;
  swatches: ThemeSwatches;
  themeRef?: string | null;
  optimisticThemeCss?: string;
}

const PENDING_THEME_STYLESHEET_SELECTOR =
  "link[data-pending-current-theme-stylesheet]";
const OPTIMISTIC_THEME_ATTRIBUTE = "data-optimistic-current-theme";
const OPTIMISTIC_THEME_STYLESHEET_SELECTOR =
  "style[data-optimistic-current-theme-stylesheet]";

let stylesheetSwapToken = 0;
let cancelPendingThemeStylesheetSwap: (() => void) | null = null;

function getAnimationFrame() {
  if (typeof window !== "undefined" && window.requestAnimationFrame) {
    return window.requestAnimationFrame.bind(window);
  }

  return (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0);
}

function scopeOptimisticCurrentThemeCss(css: string) {
  return css
    .replaceAll(
      "html:root {",
      `html:root[${OPTIMISTIC_THEME_ATTRIBUTE}] {`,
    )
    .replaceAll(
      'html[data-theme="dark"], html.dark, .cn-menu-target.dark {',
      [
        `html[${OPTIMISTIC_THEME_ATTRIBUTE}][data-theme="dark"],`,
        `html[${OPTIMISTIC_THEME_ATTRIBUTE}].dark,`,
        `html[${OPTIMISTIC_THEME_ATTRIBUTE}] .cn-menu-target.dark {`,
      ].join(" "),
    );
}

function parseCssVariables(cssBlock: string) {
  const variables = new Map<string, string>();
  const variablePattern = /--([A-Za-z0-9-_]+)\s*:\s*([^;]+);/g;

  for (const match of cssBlock.matchAll(variablePattern)) {
    const [, name, value] = match;
    if (name && value) {
      variables.set(`--${name}`, value.trim());
    }
  }

  return variables;
}

function getCssBlock(css: string, selector: string) {
  const start = css.indexOf(selector);
  if (start === -1) {
    return "";
  }

  const blockStart = css.indexOf("{", start);
  const blockEnd = css.indexOf("}", blockStart);
  if (blockStart === -1 || blockEnd === -1) {
    return "";
  }

  return css.slice(blockStart + 1, blockEnd);
}

function isCurrentThemeDark() {
  const root = document.documentElement;
  const hasDarkThemeAttr = root.getAttribute("data-theme") === "dark";
  return hasDarkThemeAttr || root.classList.contains("dark");
}

function syncOptimisticCurrentThemeInlineStyles(css: string) {
  // The hidden legacy theme editor owns inline theme variables, which outrank
  // both the refreshed link and the optimistic style.
  const root = document.documentElement;
  const rootVariables = parseCssVariables(getCssBlock(css, "html:root"));
  const darkVariables = isCurrentThemeDark()
    ? parseCssVariables(
        getCssBlock(
          css,
          'html[data-theme="dark"], html.dark, .cn-menu-target.dark',
        ),
      )
    : new Map<string, string>();

  for (const [name, value] of [...rootVariables, ...darkVariables]) {
    root.style.setProperty(name, value);
  }
}

function syncOptimisticCurrentThemeStylesheet(css?: string) {
  const existing = document.querySelector<HTMLStyleElement>(
    OPTIMISTIC_THEME_STYLESHEET_SELECTOR,
  );

  if (!css) {
    document.documentElement.removeAttribute(OPTIMISTIC_THEME_ATTRIBUTE);
    existing?.remove();
    return;
  }

  document.documentElement.setAttribute(OPTIMISTIC_THEME_ATTRIBUTE, "");
  syncOptimisticCurrentThemeInlineStyles(css);

  const stylesheet = existing ?? document.createElement("style");
  stylesheet.setAttribute("data-optimistic-current-theme-stylesheet", "");
  stylesheet.textContent = scopeOptimisticCurrentThemeCss(css);

  if (existing) {
    return;
  }

  const currentStylesheet = Array.from(
    document.querySelectorAll<HTMLLinkElement>(
      "link[data-current-theme-stylesheet]",
    ),
  ).at(-1);

  if (currentStylesheet) {
    currentStylesheet.insertAdjacentElement("afterend", stylesheet);
    return;
  }

  document.head.append(stylesheet);
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
  url.searchParams.set("v", Date.now().toString());
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

export function applyDocsPreset(options: ApplyDocsPresetOptions) {
  setStoredPreset(
    options.id,
    options.swatches,
    options.label,
    options.themeRef ?? null,
  );
  syncOptimisticCurrentThemeStylesheet(options.optimisticThemeCss);

  return refreshCurrentThemeStylesheet();
}
