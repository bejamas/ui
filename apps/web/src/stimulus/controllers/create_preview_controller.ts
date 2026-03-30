import { Controller } from "@hotwired/stimulus";
import {
  catalogs,
  getDocumentDirection,
  getDocumentLanguage,
  isInvertedMenuColor,
  isTranslucentMenuColor,
} from "@bejamas/create-config/browser";
import { syncSemanticIconsInRoot } from "@bejamas/semantic-icons/browser";
import { getCreatePickerSelectedOption } from "@/utils/create-sidebar";
import { resolveCreateBootstrapState } from "@/utils/create-bootstrap";
import { getCreatePreviewCopy } from "@/utils/create-preview-i18n";
import { buildDesignSystemThemeCss } from "@/utils/themes/design-system-adapter";
import { type ThemeOverrides } from "@/utils/themes/create-theme";
import type {
  CreateConfig,
  PreviewMessage,
  PreviewShortcutMessage,
} from "@/stimulus/types/create";

export default class extends Controller<HTMLElement> {
  connect() {
    void this.bootstrap();
  }

  receiveMessage(event: MessageEvent<PreviewMessage>) {
    if (event.origin !== window.location.origin) {
      return;
    }

    if (event.data?.type !== "bejamas:create-preview" || !event.data?.config) {
      return;
    }

    void this.applyPreviewConfig(
      event.data.config,
      event.data.themeOverrides,
      event.data.styleCss,
    );
  }

  openNavigateShortcut(event: KeyboardEvent) {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.shiftKey ||
      this.isEditableTarget(event.target)
    ) {
      return;
    }

    event.preventDefault();

    if (window.parent === window) {
      return;
    }

    window.parent.postMessage(
      {
        type: "bejamas:create-navigate-open",
      } satisfies PreviewShortcutMessage,
      window.location.origin,
    );
  }

  private async bootstrap() {
    const result = await resolveCreateBootstrapState(
      new URLSearchParams(window.location.search),
      { allowCookieFallback: false },
    );

    if (!result.success) {
      this.showInvalidState();
      this.clearPendingState();
      return;
    }

    await this.applyPreviewConfig(
      result.config,
      result.themeOverrides,
      window.__BEJAMAS_CREATE_PREVIEW__?.styleCssByStyle?.[result.config.style] ?? "",
    );
  }

  private async applyPreviewConfig(
    config: CreateConfig,
    themeOverrides: ThemeOverrides,
    styleCss?: string,
  ) {
    const themeTag = document.getElementById("create-theme-css");
    const styleTag = document.getElementById("create-style-css");

    if (themeTag) {
      themeTag.textContent = buildDesignSystemThemeCss(config, themeOverrides);
    }

    if (styleTag) {
      styleTag.textContent =
        styleCss ??
        window.__BEJAMAS_CREATE_PREVIEW__?.styleCssByStyle?.[config.style] ??
        "";
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

    this.setText(
      "[data-create-icon-library-label]",
      catalogs.iconLibraries.find(
        (library) => library.name === config.iconLibrary,
      )?.label ?? config.iconLibrary,
    );
    syncSemanticIconsInRoot(document, config.iconLibrary);
    this.setText(
      "[data-create-style-label]",
      catalogs.styles.find((style) => style.name === config.style)?.title ??
        config.style,
    );
    this.setText(
      "[data-create-font-label]",
      catalogs.fonts.find((font) => font.name === `font-${config.font}`)?.title ??
        config.font,
    );
    this.setText(
      "[data-create-style-font-summary]",
      this.buildStyleFontSummary(config),
    );
    this.setText(
      "[data-create-radius-label]",
      getCreatePickerSelectedOption("radius", config)?.label ?? config.radius,
    );
    this.setText(
      "[data-create-menu-color-label]",
      getCreatePickerSelectedOption("menuColor", config)?.label ??
        config.menuColor,
    );
    this.setLocalizedText(copy);
    this.setLocalizedPlaceholders(copy);

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

    this.showPreviewSurface();
    this.clearPendingState();
  }

  private buildStyleFontSummary(config: CreateConfig) {
    const styleLabel =
      catalogs.styles.find((style) => style.name === config.style)?.title ??
      config.style;
    const fontLabel =
      catalogs.fonts.find((font) => font.name === `font-${config.font}`)?.title ??
      config.font;
    const headingFontLabel =
      config.fontHeading === "inherit"
        ? null
        : (catalogs.fonts.find(
            (font) => font.name === `font-${config.fontHeading}`,
          )?.title ?? config.fontHeading);

    return [
      styleLabel,
      headingFontLabel && headingFontLabel !== fontLabel
        ? headingFontLabel
        : fontLabel,
    ].join(" - ");
  }

  private setText(selector: string, value: string) {
    document.querySelectorAll<HTMLElement>(selector).forEach((node) => {
      node.textContent = value;
    });
  }

  private setLocalizedText(copy: Record<string, string>) {
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

  private setLocalizedPlaceholders(copy: Record<string, string>) {
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

  private isEditableTarget(target: EventTarget | null) {
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

  private showPreviewSurface() {
    const surface = document.querySelector<HTMLElement>("[data-create-preview-surface]");
    const invalid = document.querySelector<HTMLElement>("[data-create-preview-invalid]");

    surface?.classList.remove("hidden");
    invalid?.classList.add("hidden");
  }

  private showInvalidState() {
    const surface = document.querySelector<HTMLElement>("[data-create-preview-surface]");
    const invalid = document.querySelector<HTMLElement>("[data-create-preview-invalid]");

    surface?.classList.add("hidden");
    invalid?.classList.remove("hidden");
  }

  private clearPendingState() {
    this.element.removeAttribute("data-create-preview-pending");
    document.documentElement.removeAttribute("data-create-preview-pending");
  }
}
