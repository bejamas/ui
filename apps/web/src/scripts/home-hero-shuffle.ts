import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  catalogs,
  decodePreset,
  encodePreset,
  isPresetCode,
} from "@bejamas/create-config/browser";
import { createRandomDesignSystemConfig } from "@/utils/create-sidebar";
import {
  incrementShuffleCountRequest,
  formatShuffleCount,
} from "@/utils/shuffles";
import { applyDocsPreset } from "@/utils/themes/apply-docs-preset";
import { getStoredPreset } from "@/utils/themes/preset-store";
import { resolveDesignSystemTheme } from "@/utils/themes/design-system-adapter";

function getPresetLabel(preset: { style: string; font: string }) {
  const styleLabel =
    catalogs.styles.find((style) => style.name === preset.style)?.title ??
    preset.style;
  const fontLabel =
    catalogs.fonts.find((font) => font.name === `font-${preset.font}`)?.title ??
    preset.font;

  return `${styleLabel} - ${fontLabel}`;
}

function getCurrentConfig() {
  const storedPreset = getStoredPreset();
  if (storedPreset && isPresetCode(storedPreset)) {
    const decoded = decodePreset(storedPreset);
    if (decoded) {
      return {
        ...DEFAULT_DESIGN_SYSTEM_CONFIG,
        ...decoded,
      };
    }
  }

  return DEFAULT_DESIGN_SYSTEM_CONFIG;
}

class HeroShuffleControlElement extends HTMLElement {
  private button: HTMLButtonElement | null = null;
  private countLabel: HTMLElement | null = null;
  private busy = false;

  private getCount() {
    return Number.parseInt(this.dataset.count ?? "0", 10) || 0;
  }

  private renderCount(count: number) {
    this.dataset.count = String(count);

    if (this.countLabel) {
      this.countLabel.textContent = `${formatShuffleCount(count)} shuffles`;
    }
  }

  private onClick = async () => {
    if (this.busy) {
      return;
    }

    this.busy = true;
    this.button?.setAttribute("disabled", "");

    const config = createRandomDesignSystemConfig(getCurrentConfig());
    const presetId = encodePreset(config);
    const styles = resolveDesignSystemTheme(config).styles;

    applyDocsPreset({
      id: presetId,
      label: getPresetLabel(config),
      swatches: {
        primaryLight: styles.light.primary ?? "oklch(0.2 0 0)",
        accentLight: styles.light.accent ?? "oklch(0.7 0 0)",
        primaryDark: styles.dark.primary ?? "oklch(0.98 0 0)",
        accentDark: styles.dark.accent ?? "oklch(0.8 0 0)",
      },
      themeRef: null,
    });

    this.renderCount(this.getCount() + 1);

    const nextCount = await incrementShuffleCountRequest();
    if (typeof nextCount === "number") {
      this.renderCount(nextCount);
    }

    this.busy = false;
    this.button?.removeAttribute("disabled");
  };

  connectedCallback() {
    this.button = this.querySelector<HTMLButtonElement>(
      "[data-hero-shuffle-button]",
    );
    this.countLabel = this.querySelector<HTMLElement>(
      "[data-hero-shuffle-count]",
    );
    this.button?.addEventListener("click", this.onClick);
  }

  disconnectedCallback() {
    this.button?.removeEventListener("click", this.onClick);
  }
}

if (!customElements.get("hero-shuffle-control")) {
  customElements.define("hero-shuffle-control", HeroShuffleControlElement);
}
