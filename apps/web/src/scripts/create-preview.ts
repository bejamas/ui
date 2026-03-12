import {
  catalogs,
  getDocumentDirection,
  getDocumentLanguage,
  isInvertedMenuColor,
  isTranslucentMenuColor,
  type DesignSystemConfig,
} from "@bejamas/create-config/browser";
import { syncSemanticIconsInRoot } from "@bejamas/semantic-icons/browser";
import { getCreatePickerSelectedOption } from "@/utils/create-sidebar";
import { getCreatePreviewCopy } from "@/utils/create-preview-i18n";
import { buildDesignSystemThemeCss } from "@/utils/themes/design-system-adapter";
import {
  normalizeThemeOverrides,
  type ThemeOverrides,
} from "@/utils/themes/create-theme";

type PreviewMessage = {
  type: "bejamas:create-preview";
  config: DesignSystemConfig;
  themeRef: string | null;
  themeOverrides: ThemeOverrides;
};

type PreviewShortcutMessage = {
  type: "bejamas:create-navigate-open";
};

declare global {
  interface Window {
    __BEJAMAS_CREATE_PREVIEW__?: {
      styleCssByStyle: Record<string, string>;
      initialThemeOverrides?: Partial<ThemeOverrides> | null;
      initialConfig?: DesignSystemConfig | null;
    };
  }
}

window.addEventListener("message", (event: MessageEvent<PreviewMessage>) => {
  if (event.origin !== window.location.origin) {
    return;
  }

  if (event.data?.type !== "bejamas:create-preview" || !event.data?.config) {
    return;
  }

  applyPreviewConfig(
    event.data.config,
    normalizeThemeOverrides(event.data.themeOverrides),
  );
});

const initialConfig = window.__BEJAMAS_CREATE_PREVIEW__?.initialConfig;
if (initialConfig) {
  applyPreviewConfig(
    initialConfig,
    normalizeThemeOverrides(
      window.__BEJAMAS_CREATE_PREVIEW__?.initialThemeOverrides,
    ),
  );
}

window.addEventListener(
  "keydown",
  (event) => {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.shiftKey ||
      !(event.metaKey || event.ctrlKey) ||
      event.key.toLowerCase() !== "p" ||
      isEditableTarget(event.target)
    ) {
      return;
    }

    event.preventDefault();
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: "bejamas:create-navigate-open",
        } satisfies PreviewShortcutMessage,
        window.location.origin,
      );
    }
  },
  { capture: true },
);

function applyPreviewConfig(
  config: DesignSystemConfig,
  themeOverrides: ThemeOverrides,
) {
  const themeTag = document.getElementById("create-theme-css");
  const styleTag = document.getElementById("create-style-css");

  if (themeTag) {
    themeTag.textContent = buildDesignSystemThemeCss(config, themeOverrides);
  }

  if (styleTag) {
    styleTag.textContent =
      window.__BEJAMAS_CREATE_PREVIEW__?.styleCssByStyle?.[config.style] ?? "";
  }

  Array.from(document.body.classList).forEach((className) => {
    if (className.startsWith("style-")) {
      document.body.classList.remove(className);
    }
  });
  document.body.classList.add(`style-${config.style}`);

  document.documentElement.dir = getDocumentDirection(config);
  document.documentElement.lang = getDocumentLanguage(config);

  const copy = getCreatePreviewCopy(getDocumentLanguage(config));

  setText(
    "[data-create-icon-library-label]",
    catalogs.iconLibraries.find(
      (library) => library.name === config.iconLibrary,
    )?.label ?? config.iconLibrary,
  );
  syncSemanticIconsInRoot(document, config.iconLibrary);
  setText(
    "[data-create-style-label]",
    catalogs.styles.find((style) => style.name === config.style)?.title ??
      config.style,
  );
  setText(
    "[data-create-font-label]",
    catalogs.fonts.find((font) => font.name === `font-${config.font}`)?.title ??
      config.font,
  );
  setText(
    "[data-create-style-font-summary]",
    [
      catalogs.styles.find((style) => style.name === config.style)?.title ??
        config.style,
      catalogs.fonts.find((font) => font.name === `font-${config.font}`)
        ?.title ?? config.font,
    ].join(" - "),
  );
  setText(
    "[data-create-radius-label]",
    getCreatePickerSelectedOption("radius", config)?.label ?? config.radius,
  );
  setText(
    "[data-create-menu-color-label]",
    getCreatePickerSelectedOption("menuColor", config)?.label ??
      config.menuColor,
  );
  setLocalizedText(copy);
  setLocalizedPlaceholders(copy);

  document
    .querySelectorAll<HTMLElement>(
      "[data-create-menu-preview], .cn-menu-target",
    )
    .forEach((node) => {
      node.classList.toggle("dark", isInvertedMenuColor(config.menuColor));
      node.classList.toggle(
        "cn-menu-translucent",
        isTranslucentMenuColor(config.menuColor),
      );
    });
}

function setText(selector: string, value: string) {
  document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
    node.textContent = value;
  });
}

function setLocalizedText(copy: Record<string, string>) {
  document
    .querySelectorAll<HTMLElement>("[data-create-preview-text]")
    .forEach((node) => {
      const key = node.dataset.createPreviewText;
      if (!key || !(key in copy)) {
        return;
      }

      node.textContent = copy[key];
    });
}

function setLocalizedPlaceholders(copy: Record<string, string>) {
  document
    .querySelectorAll<HTMLElement>("[data-create-preview-placeholder]")
    .forEach((node) => {
      const key = node.dataset.createPreviewPlaceholder;
      if (!key || !(key in copy)) {
        return;
      }

      const value = copy[key];
      if (
        node instanceof HTMLInputElement ||
        node instanceof HTMLTextAreaElement
      ) {
        node.placeholder = value;
        return;
      }

      node.textContent = value;
      node.setAttribute("data-placeholder", value);
    });
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      [
        'input:not([type="checkbox"]):not([type="radio"])',
        "textarea",
        "select",
        '[contenteditable=""]',
        '[contenteditable="true"]',
      ].join(","),
    ),
  );
}
