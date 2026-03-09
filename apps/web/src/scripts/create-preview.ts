import {
  catalogs,
  getDocumentDirection,
  getDocumentLanguage,
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

declare global {
  interface Window {
    __BEJAMAS_CREATE_PREVIEW__?: {
      styleCssByStyle: Record<string, string>;
      initialThemeOverrides?: Partial<ThemeOverrides> | null;
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

  const { config } = event.data;
  const themeTag = document.getElementById("create-theme-css");
  const styleTag = document.getElementById("create-style-css");

  if (themeTag) {
    themeTag.textContent = buildDesignSystemThemeCss(
      config,
      normalizeThemeOverrides(event.data.themeOverrides),
    );
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
  setText("[data-create-template-label]", config.template);
  setText(
    "[data-create-radius-label]",
    getCreatePickerSelectedOption("radius", config)?.label ?? config.radius,
  );
  setText("[data-create-menu-color-label]", config.menuColor);
  setLocalizedText(copy);
  setLocalizedPlaceholders(copy);

  document
    .querySelectorAll<HTMLElement>(
      "[data-create-menu-preview], .cn-menu-target",
    )
    .forEach((node) => {
      node.classList.toggle("dark", config.menuColor === "inverted");
    });
});

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
