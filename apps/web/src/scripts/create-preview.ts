import {
  catalogs,
  type DesignSystemConfig,
} from "@bejamas/create-config/browser";
import { syncSemanticIconsInRoot } from "@bejamas/semantic-icons/browser";
import { getCreatePickerSelectedOption } from "@/utils/create-sidebar";
import { buildDesignSystemThemeCss } from "@/utils/themes/design-system-adapter";

type PreviewMessage = {
  type: "bejamas:create-preview";
  config: DesignSystemConfig;
};

declare global {
  interface Window {
    __BEJAMAS_CREATE_PREVIEW__?: {
      styleCssByStyle: Record<string, string>;
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
    themeTag.textContent = buildDesignSystemThemeCss(config);
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

  document.documentElement.dir = config.rtl ? "rtl" : "ltr";

  setText(
    "[data-create-icon-library-label]",
    catalogs.iconLibraries.find((library) => library.name === config.iconLibrary)?.label ??
      config.iconLibrary,
  );
  syncSemanticIconsInRoot(document, config.iconLibrary);
  setText(
    "[data-create-style-label]",
    catalogs.styles.find((style) => style.name === config.style)?.title ?? config.style,
  );
  setText(
    "[data-create-font-label]",
    catalogs.fonts.find((font) => font.name === `font-${config.font}`)?.title ?? config.font,
  );
  setText("[data-create-template-label]", config.template);
  setText(
    "[data-create-radius-label]",
    getCreatePickerSelectedOption("radius", config)?.label ?? config.radius,
  );
  setText("[data-create-menu-color-label]", config.menuColor);

  document.querySelectorAll<HTMLElement>("[data-create-menu-preview], .cn-menu-target").forEach((node) => {
    node.classList.toggle("dark", config.menuColor === "inverted");
  });
});

function setText(selector: string, value: string) {
  document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
    node.textContent = value;
  });
}
