import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  LEGACY_PRESET_STYLES,
  PRESET_STYLES,
  PRESET_THEMES,
  SHARED_PRESET_STYLES,
} from "@bejamas/create-config/browser";
import { PRESET_STORAGE_KEY } from "./themes/preset-store";
import { PRESET_COOKIE_NAME } from "./themes/theme-cookie";

export const CREATE_DOCS_ROOT_ATTRIBUTE = "data-create-docs-themed";
export const CREATE_DOCS_ROOT_STYLE_ATTRIBUTE = "data-create-docs-style";

export interface CreateDocsStyleRoot {
  classList: {
    add: (...tokens: string[]) => void;
    remove: (...tokens: string[]) => void;
  };
  getAttribute: (name: string) => string | null;
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
}

export function getCreateStyleClass(style: string) {
  return `style-${style}`;
}

export function applyCreateDocsRootState(
  root: CreateDocsStyleRoot,
  style: string,
) {
  const nextStyleClass = getCreateStyleClass(style);
  const previousStyleClass = root.getAttribute(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE);

  if (previousStyleClass && previousStyleClass !== nextStyleClass) {
    root.classList.remove(previousStyleClass);
  }

  root.setAttribute(CREATE_DOCS_ROOT_ATTRIBUTE, "");
  root.setAttribute(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE, nextStyleClass);
  root.classList.add(nextStyleClass);
}

export function cleanupCreateDocsRootState(root: CreateDocsStyleRoot) {
  const previousStyleClass = root.getAttribute(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE);

  if (previousStyleClass) {
    root.classList.remove(previousStyleClass);
  }

  root.removeAttribute(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE);
  root.removeAttribute(CREATE_DOCS_ROOT_ATTRIBUTE);
}

export function buildCreateDocsRootInitScript(style: string) {
  return `(function () {
  const rootAttribute = ${JSON.stringify(CREATE_DOCS_ROOT_ATTRIBUTE)};
  const rootStyleAttribute = ${JSON.stringify(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE)};
  const nextStyleClass = ${JSON.stringify(getCreateStyleClass(style))};
  const root = document.documentElement;
  const previousStyleClass = root.getAttribute(rootStyleAttribute);

  if (previousStyleClass && previousStyleClass !== nextStyleClass) {
    root.classList.remove(previousStyleClass);
  }

  root.setAttribute(rootAttribute, "");
  root.setAttribute(rootStyleAttribute, nextStyleClass);
  root.classList.add(nextStyleClass);
})();`;
}

export function buildCreateDocsRootPrepaintScript() {
  return `(function () {
  const rootAttribute = ${JSON.stringify(CREATE_DOCS_ROOT_ATTRIBUTE)};
  const rootStyleAttribute = ${JSON.stringify(CREATE_DOCS_ROOT_STYLE_ATTRIBUTE)};
  const defaultStyle = ${JSON.stringify(DEFAULT_DESIGN_SYSTEM_CONFIG.style)};
  const cookieName = ${JSON.stringify(PRESET_COOKIE_NAME)};
  const storageKey = ${JSON.stringify(PRESET_STORAGE_KEY)};
  const allowedStyles = ${JSON.stringify(PRESET_STYLES)};
  const legacyStyles = ${JSON.stringify(LEGACY_PRESET_STYLES)};
  const sharedStyles = ${JSON.stringify(SHARED_PRESET_STYLES)};
  const legacyThemes = ${JSON.stringify(PRESET_THEMES)};
  const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const VALID_VERSIONS = ["a", "b", "c"];
  const MAX_LEGACY_B_PRESET_LENGTH = 8;
  const THEME_OFFSET = 22;
  const STYLE_OFFSET = 34;
  const FIELD_BITS = 6;
  const root = document.documentElement;
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
      const charIndex = BASE62.indexOf(value[index]);
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

    if (!VALID_VERSIONS.includes(value[0])) {
      return false;
    }

    for (let index = 1; index < value.length; index += 1) {
      if (!BASE62.includes(value[index])) {
        return false;
      }
    }

    return true;
  };
  const decodeFieldValue = (code, offset, bits, values) => {
    const numeric = fromBase62(code.slice(1));
    if (numeric < 0) {
      return null;
    }

    const index = Math.floor(numeric / 2 ** offset) % 2 ** bits;
    return index < values.length ? values[index] : values[0];
  };
  const shouldDecodeLegacyBejamasB = (code) => {
    if (code.length > MAX_LEGACY_B_PRESET_LENGTH) {
      return false;
    }

    const decodedTheme = decodeFieldValue(code, THEME_OFFSET, FIELD_BITS, legacyThemes);
    return !!decodedTheme?.startsWith("bejamas-");
  };
  const decodePresetStyle = (code) => {
    if (!isPresetCode(code)) {
      return null;
    }

    const version = code[0];

    if (version === "a") {
      return decodeFieldValue(code, STYLE_OFFSET, FIELD_BITS, sharedStyles);
    }

    if (version === "b") {
      return decodeFieldValue(
        code,
        STYLE_OFFSET,
        FIELD_BITS,
        shouldDecodeLegacyBejamasB(code) ? legacyStyles : sharedStyles,
      );
    }

    if (version === "c") {
      return decodeFieldValue(code, STYLE_OFFSET, FIELD_BITS, legacyStyles);
    }

    return null;
  };
  const resolveCreateStyle = () => {
    const searchParams = new URLSearchParams(location.search);
    const explicitStyle = searchParams.get("style");
    if (explicitStyle && allowedStyles.includes(explicitStyle)) {
      return explicitStyle;
    }

    const presetStyle = decodePresetStyle(searchParams.get("preset"));
    if (presetStyle) {
      return presetStyle;
    }

    const cookieStyle = decodePresetStyle(
      parseThemeCookiePreset(readCookie(cookieName)),
    );
    if (cookieStyle) {
      return cookieStyle;
    }

    let storedPreset = null;
    try {
      storedPreset =
        typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) : null;
    } catch {}

    const storedStyle = decodePresetStyle(storedPreset);
    if (storedStyle) {
      return storedStyle;
    }

    return defaultStyle;
  };
  const nextStyleClass = "style-" + resolveCreateStyle();
  const previousStyleClass = root.getAttribute(rootStyleAttribute);

  if (previousStyleClass && previousStyleClass !== nextStyleClass) {
    root.classList.remove(previousStyleClass);
  }

  root.setAttribute(rootAttribute, "");
  root.setAttribute(rootStyleAttribute, nextStyleClass);
  root.classList.add(nextStyleClass);
})();`;
}
