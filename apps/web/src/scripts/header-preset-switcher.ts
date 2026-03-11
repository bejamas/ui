import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  decodePreset,
  isPresetCode,
  catalogs,
} from "@bejamas/create-config/browser";
import type { ThemeStyles } from "@/types/theme";
import { applyDocsPreset } from "@/utils/themes/apply-docs-preset";
import { resolveDesignSystemTheme } from "@/utils/themes/design-system-adapter";
import {
  PRESET_CHANGE_EVENT,
  getStoredPresetWithSwatches,
} from "@/utils/themes/preset-store";
import { THEME_REF_COOKIE_NAME } from "@/utils/themes/theme-cookie";

type HeaderPresetColorPair = {
  primary: string;
  accent: string;
};

type HeaderPresetSwatches = {
  light: HeaderPresetColorPair;
  dark: HeaderPresetColorPair;
};

type CurrentSummary = {
  id: string;
  label: string;
  swatches: HeaderPresetSwatches;
  createHref: string;
  themeRef: string | null;
};

type PresetOption = CurrentSummary & {
  styles: ThemeStyles;
};

function readCookie(name: string) {
  const match = document.cookie.match(
    new RegExp(
      `(?:^|; )${name.replace(/[$()*+.?[\\\\\\]^{|}]/g, "\\$&")}=([^;]*)`,
    ),
  );

  return match ? decodeURIComponent(match[1]) : null;
}

function getPresetLabel(preset: { style: string; font: string }) {
  const styleLabel =
    catalogs.styles.find((style) => style.name === preset.style)?.title ??
    preset.style;
  const fontLabel =
    catalogs.fonts.find((font) => font.name === `font-${preset.font}`)?.title ??
    preset.font;

  return `${styleLabel} - ${fontLabel}`;
}

function getSwatchesFromStyles(styles: Record<string, Record<string, string>>) {
  return {
    light: {
      primary: styles.light?.primary ?? "oklch(0.2 0 0)",
      accent: styles.light?.accent ?? "oklch(0.7 0 0)",
    },
    dark: {
      primary: styles.dark?.primary ?? "oklch(0.98 0 0)",
      accent: styles.dark?.accent ?? "oklch(0.8 0 0)",
    },
  };
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

  onSelect = (event: Event) => {
    const presetId = (event as CustomEvent<{ value: string }>).detail?.value;
    if (!presetId) {
      return;
    }

    const preset = this.presets.get(presetId);
    if (!preset) {
      return;
    }

    applyDocsPreset({
      id: preset.id,
      label: preset.label,
      swatches: {
        primaryLight: preset.swatches.light.primary,
        accentLight: preset.swatches.light.accent,
        primaryDark: preset.swatches.dark.primary,
        accentDark: preset.swatches.dark.accent,
      },
      themeRef: null,
    });

    this.renderCurrent({
      id: preset.id,
      label: preset.label,
      swatches: preset.swatches,
      createHref: preset.createHref,
      themeRef: null,
    });
    this.renderSelectedPreset(preset.id);
  };

  connectedCallback() {
    this.current = this.parseJson<CurrentSummary>(this.dataset.current);
    const presets = this.parseJson<PresetOption[]>(this.dataset.presets) ?? [];
    this.presets = new Map(presets.map((preset) => [preset.id, preset]));

    this.addEventListener("dropdown-menu:select", this.onSelect);
    window.addEventListener(PRESET_CHANGE_EVENT, this.onPresetChange);
    window.addEventListener("storage", this.onStorage);
    document.addEventListener("astro:after-swap", this.onAfterSwap);
    this.syncFromStoredState();
  }

  disconnectedCallback() {
    this.removeEventListener("dropdown-menu:select", this.onSelect);
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

    if (!stored) {
      if (this.current) {
        this.renderCurrent(this.current);
      }
      this.renderSelectedPreset(this.dataset.selectedPresetId || null);
      return;
    }

    const curatedPreset = themeRef ? null : this.presets.get(stored.id);
    if (curatedPreset) {
      this.renderCurrent({
        id: curatedPreset.id,
        label: curatedPreset.label,
        swatches: curatedPreset.swatches,
        createHref: curatedPreset.createHref,
        themeRef: null,
      });
      this.renderSelectedPreset(curatedPreset.id);
      return;
    }

    if (
      this.current &&
      stored.id === this.current.id &&
      themeRef === (this.current.themeRef ?? null)
    ) {
      this.renderCurrent(this.current);
      this.renderSelectedPreset(null);
      return;
    }

    if (stored.swatches && !isPresetCode(stored.id)) {
      this.renderCurrent({
        id: stored.id,
        label: stored.name ?? stored.id,
        swatches: {
          light: {
            primary: stored.swatches.primaryLight,
            accent: stored.swatches.accentLight,
          },
          dark: {
            primary: stored.swatches.primaryDark,
            accent: stored.swatches.accentDark,
          },
        },
        createHref: themeRef
          ? `/create?themeRef=${encodeURIComponent(themeRef)}`
          : "/create",
        themeRef,
      });
      this.renderSelectedPreset(null);
      return;
    }

    if (isPresetCode(stored.id)) {
      const decoded = decodePreset(stored.id);
      if (decoded) {
        const styles = resolveDesignSystemTheme({
          ...DEFAULT_DESIGN_SYSTEM_CONFIG,
          ...decoded,
        }).styles;
        this.renderCurrent({
          id: stored.id,
          label: getPresetLabel(decoded),
          swatches: getSwatchesFromStyles(styles),
          createHref: `/create?preset=${encodeURIComponent(stored.id)}${
            themeRef ? `&themeRef=${encodeURIComponent(themeRef)}` : ""
          }`,
          themeRef,
        });
        this.renderSelectedPreset(null);
        return;
      }
    }

    this.renderCurrent({
      id: stored.id,
      label: stored.name ?? stored.id,
      swatches: this.current?.swatches ?? {
        light: { primary: "oklch(0.2 0 0)", accent: "oklch(0.7 0 0)" },
        dark: { primary: "oklch(0.98 0 0)", accent: "oklch(0.8 0 0)" },
      },
      createHref: themeRef
        ? `/create?themeRef=${encodeURIComponent(themeRef)}`
        : "/create",
      themeRef,
    });
    this.renderSelectedPreset(null);
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

  renderSelectedPreset(selectedPresetId: string | null) {
    this.dataset.selectedPresetId = selectedPresetId ?? "";
    this.querySelectorAll<HTMLElement>("[data-header-preset-id]").forEach(
      (item) => {
        item.toggleAttribute(
          "data-selected",
          item.dataset.headerPresetId === selectedPresetId,
        );
      },
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
