import { applyDocsPreset } from "@/utils/themes/apply-docs-preset";
import {
  PRESET_CHANGE_EVENT,
  getStoredPresetWithSwatches,
} from "@/utils/themes/preset-store";
import { getCustomPresets } from "@/utils/themes/custom-presets-store";
import { THEME_REF_COOKIE_NAME } from "@/utils/themes/theme-cookie";
import {
  type HeaderPresetOption as PresetOption,
  type HeaderPresetSummary as CurrentSummary,
  resolveHeaderPresetSelection,
  getThemeSwatchesFromStyles,
} from "@/utils/themes/header-preset-summary";

function readCookie(name: string) {
  const match = document.cookie.match(
    new RegExp(
      `(?:^|; )${name.replace(/[$()*+.?[\\\\\\]^{|}]/g, "\\$&")}=([^;]*)`,
    ),
  );

  return match ? decodeURIComponent(match[1]) : null;
}

class HeaderPresetSwitcherElement extends HTMLElement {
  current: CurrentSummary | null = null;
  presets = new Map<string, PresetOption>();

  onPresetChange = () => {
    this.syncFromStoredState();
  };

  onStorage = (event: StorageEvent) => {
    if (event.key && event.key !== "theme-preset") {
      return;
    }

    this.syncFromStoredState();
  };

  onAfterSwap = () => {
    this.syncFromStoredState();
  };

  onValueChange = (event: Event) => {
    const detail = (event as CustomEvent<{
      value: string | null;
      source: string;
    }>).detail;
    const presetId = detail?.value;
    if (
      !presetId ||
      (detail.source !== "pointer" && detail.source !== "keyboard")
    ) {
      return;
    }

    const preset = this.presets.get(presetId);
    if (!preset) {
      return;
    }

    applyDocsPreset({
      id: preset.id,
      label: preset.label,
      swatches: getThemeSwatchesFromStyles(preset.styles),
      themeRef: null,
    });

    this.renderCurrent({
      id: preset.id,
      label: preset.label,
      swatches: preset.swatches,
      createHref: preset.createHref,
      themeRef: null,
    });
    this.syncSelectedPreset(preset.id);
  };

  connectedCallback() {
    this.current = this.parseJson<CurrentSummary>(this.dataset.current);
    const presets = this.parseJson<PresetOption[]>(this.dataset.presets) ?? [];
    this.presets = new Map(presets.map((preset) => [preset.id, preset]));

    this.addEventListener("dropdown-menu:value-change", this.onValueChange);
    window.addEventListener(PRESET_CHANGE_EVENT, this.onPresetChange);
    window.addEventListener("storage", this.onStorage);
    document.addEventListener("astro:after-swap", this.onAfterSwap);
    this.syncFromStoredState();
  }

  disconnectedCallback() {
    this.removeEventListener("dropdown-menu:value-change", this.onValueChange);
    window.removeEventListener(PRESET_CHANGE_EVENT, this.onPresetChange);
    window.removeEventListener("storage", this.onStorage);
    document.removeEventListener("astro:after-swap", this.onAfterSwap);
  }

  parseJson<T>(value?: string) {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  syncFromStoredState() {
    const stored = getStoredPresetWithSwatches();
    const themeRef = readCookie(THEME_REF_COOKIE_NAME);
    const customPresets = getCustomPresets();

    const next = resolveHeaderPresetSelection({
      current: this.current,
      presets: Array.from(this.presets.values()),
      stored,
      themeRef,
      customPresets,
    });

    if (!next.summary) {
      return;
    }

    this.renderCurrent(next.summary);
    this.syncSelectedPreset(next.selectedPresetId);
  }

  renderCurrent(summary: CurrentSummary) {
    this.current = summary;
    this.dataset.current = JSON.stringify(summary);

    const label = this.querySelector<HTMLElement>("[data-current-label]");
    if (label) {
      label.textContent = summary.label;
    }

    const createLink = this.querySelector<HTMLAnchorElement>(
      "[data-create-your-own]",
    );
    if (createLink) {
      createLink.href = summary.createHref;
    }

    this.updateSwatch("light-primary", summary.swatches.light.primary);
    this.updateSwatch("light-accent", summary.swatches.light.accent);
    this.updateSwatch("dark-primary", summary.swatches.dark.primary);
    this.updateSwatch("dark-accent", summary.swatches.dark.accent);
  }

  syncSelectedPreset(selectedPresetId: string | null) {
    this.dataset.selectedPresetId = selectedPresetId ?? "";
    this.querySelector<HTMLElement>('[data-slot="dropdown-menu"]')?.dispatchEvent(
      new CustomEvent("dropdown-menu:set", {
        detail: {
          value: selectedPresetId,
          source: "restore",
        },
      }),
    );
  }

  updateSwatch(name: string, color: string) {
    const swatch = this.querySelector<HTMLElement>(
      `[data-current-swatch="${name}"]`,
    );
    if (swatch) {
      swatch.style.background = color;
    }
  }
}

if (!customElements.get("header-preset-switcher")) {
  customElements.define("header-preset-switcher", HeaderPresetSwitcherElement);
}
