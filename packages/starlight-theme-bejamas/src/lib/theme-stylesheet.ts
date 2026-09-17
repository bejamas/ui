export const CURRENT_THEME_STYLESHEET_SELECTOR =
  "link[data-current-theme-stylesheet]";

export function buildCurrentThemeStylesheetHref(
  href: string,
  version: string | number,
) {
  const url = new URL(href, "https://ui.bejamas.com");
  url.searchParams.set("v", String(version));

  const isAbsolute = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href);
  return isAbsolute
    ? url.toString()
    : `${url.pathname}${url.search}${url.hash}`;
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

  // Strictly-monotonic version so two refreshes in the same millisecond can
  // never collide on a cached response (which would swap in a stale theme).
  const nextHref = buildCurrentThemeStylesheetHref(
    currentStylesheet.href,
    `${Date.now()}-${++stylesheetVersionCounter}`,
  );
  const nextStylesheet = currentStylesheet.cloneNode(true) as HTMLLinkElement;
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
    currentStylesheet.insertAdjacentElement("afterend", nextStylesheet);
  });
}
