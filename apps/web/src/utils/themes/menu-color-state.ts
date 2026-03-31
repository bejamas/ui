import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  PRESET_MENU_COLORS,
  decodePreset,
  isInvertedMenuColor,
  isPresetCode,
  isTranslucentMenuColor,
  type DesignSystemConfig,
} from "@bejamas/create-config/browser";
import { PRESET_STORAGE_KEY, PRESET_CHANGE_EVENT } from "./preset-store";
import { PRESET_COOKIE_NAME } from "./theme-cookie";

export const MENU_SURFACE_SELECTOR = ".cn-menu-target, [data-menu-translucent]";
export const MENU_TRANSLUCENT_MARKER_ATTRIBUTE = "data-menu-translucent";

type MenuSurfaceClassList = Pick<DOMTokenList, "add" | "contains" | "remove">;

export interface MenuSurfaceStateElement {
  classList: MenuSurfaceClassList;
  removeAttribute: (name: string) => void;
  setAttribute: (name: string, value: string) => void;
}

export interface MenuSurfaceStateRoot {
  querySelectorAll: (
    selector: string,
  ) => ArrayLike<MenuSurfaceStateElement> | Iterable<MenuSurfaceStateElement>;
}

export function resolvePresetMenuColor(
  presetId: string | null | undefined,
): DesignSystemConfig["menuColor"] {
  if (!presetId || !isPresetCode(presetId)) {
    return DEFAULT_DESIGN_SYSTEM_CONFIG.menuColor;
  }

  return (
    decodePreset(presetId)?.menuColor ?? DEFAULT_DESIGN_SYSTEM_CONFIG.menuColor
  );
}

export function syncMenuSurfaceElements(
  elements: ArrayLike<MenuSurfaceStateElement> | Iterable<MenuSurfaceStateElement>,
  menuColor: DesignSystemConfig["menuColor"],
) {
  const inverted = isInvertedMenuColor(menuColor);
  const translucent = isTranslucentMenuColor(menuColor);

  for (const element of Array.from(elements)) {
    if (element.classList.contains("cn-menu-target")) {
      if (inverted) {
        element.classList.add("dark");
      } else {
        element.classList.remove("dark");
      }
    }

    if (translucent) {
      element.classList.add("cn-menu-translucent");
      element.removeAttribute(MENU_TRANSLUCENT_MARKER_ATTRIBUTE);
    } else if (element.classList.contains("cn-menu-translucent")) {
      element.classList.remove("cn-menu-translucent");
      element.setAttribute(MENU_TRANSLUCENT_MARKER_ATTRIBUTE, "");
    }
  }
}

export function syncMenuSurfaceState(
  root: MenuSurfaceStateRoot,
  menuColor: DesignSystemConfig["menuColor"],
) {
  syncMenuSurfaceElements(root.querySelectorAll(MENU_SURFACE_SELECTOR), menuColor);
}

export function buildMenuColorRootBootstrapScript() {
  return `(function () {
  const root = document.documentElement;
  const cookieName = ${JSON.stringify(PRESET_COOKIE_NAME)};
  const storageKey = ${JSON.stringify(PRESET_STORAGE_KEY)};
  const setupKey = "__bejamasMenuColorStateSync";
  const eventName = ${JSON.stringify(PRESET_CHANGE_EVENT)};
  const defaultMenuColor = ${JSON.stringify(DEFAULT_DESIGN_SYSTEM_CONFIG.menuColor)};
  const menuColors = ${JSON.stringify(PRESET_MENU_COLORS)};
  const menuSurfaceSelector = ${JSON.stringify(MENU_SURFACE_SELECTOR)};
  const menuTranslucentMarkerAttribute = ${JSON.stringify(MENU_TRANSLUCENT_MARKER_ATTRIBUTE)};
  const base62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const validVersions = ["a", "b", "c"];
  const menuColorBits = 3;
  const menuColorOffset = 0;
  const readCookie = (name) => {
    const match = document.cookie.match(
      new RegExp('(?:^|;)\\\\s*' + name + '=([^;]+)'),
    );

    return match ? decodeURIComponent(match[1]) : null;
  };
  const parseThemeCookiePreset = (value) => {
    if (!value) {
      return null;
    }

    return value.split("|")[0] || null;
  };
  const fromBase62 = (value) => {
    let result = 0;

    for (let index = 0; index < value.length; index += 1) {
      const charIndex = base62.indexOf(value[index]);
      if (charIndex === -1) {
        return -1;
      }

      result = result * 62 + charIndex;
    }

    return result;
  };
  const isPresetCode = (value) => {
    if (!value || value.length < 2 || value.length > 10) {
      return false;
    }

    if (!validVersions.includes(value[0])) {
      return false;
    }

    for (let index = 1; index < value.length; index += 1) {
      if (!base62.includes(value[index])) {
        return false;
      }
    }

    return true;
  };
  const decodePresetMenuColor = (presetId) => {
    if (!isPresetCode(presetId)) {
      return null;
    }

    const bits = fromBase62(presetId.slice(1));
    if (bits < 0) {
      return null;
    }

    const index = Math.floor(bits / 2 ** menuColorOffset) % 2 ** menuColorBits;
    return index < menuColors.length ? menuColors[index] : menuColors[0];
  };
  const syncMenuSurfaceState = (menuColor) => {
    const nextMenuColor =
      typeof menuColor === "string" && menuColors.includes(menuColor)
        ? menuColor
        : defaultMenuColor;
    const inverted =
      nextMenuColor === "inverted" || nextMenuColor === "inverted-translucent";
    const translucent =
      nextMenuColor === "default-translucent" ||
      nextMenuColor === "inverted-translucent";
    const elements = document.querySelectorAll(menuSurfaceSelector);

    elements.forEach((element) => {
      if (element.classList.contains("cn-menu-target")) {
        if (inverted) {
          element.classList.add("dark");
        } else {
          element.classList.remove("dark");
        }
      }

      if (translucent) {
        element.classList.add("cn-menu-translucent");
        element.removeAttribute(menuTranslucentMarkerAttribute);
      } else if (element.classList.contains("cn-menu-translucent")) {
        element.classList.remove("cn-menu-translucent");
        element.setAttribute(menuTranslucentMarkerAttribute, "");
      }
    });
  };
  const resolveInitialMenuColor = () => {
    const cookiePreset = decodePresetMenuColor(
      parseThemeCookiePreset(readCookie(cookieName)),
    );
    if (cookiePreset) {
      return cookiePreset;
    }

    let storedPreset = null;
    try {
      storedPreset =
        typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) : null;
    } catch {}

    return decodePresetMenuColor(storedPreset) ?? defaultMenuColor;
  };
  let currentMenuColor = resolveInitialMenuColor();
  let frameId = 0;
  const scheduleMenuSync = () => {
    if (frameId) {
      return;
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = 0;
      syncMenuSurfaceState(currentMenuColor);
    });
  };

  syncMenuSurfaceState(currentMenuColor);

  if (window[setupKey]) {
    return;
  }

  window[setupKey] = true;
  const observer = new MutationObserver(() => {
    scheduleMenuSync();
  });
  observer.observe(root, {
    childList: true,
    subtree: true,
  });
  window.addEventListener(eventName, (event) => {
    currentMenuColor =
      event instanceof CustomEvent &&
      typeof event.detail?.preset?.menuColor === "string"
        ? event.detail.preset.menuColor
        : defaultMenuColor;

    syncMenuSurfaceState(currentMenuColor);
  });
})();`;
}
