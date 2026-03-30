import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  DEFAULT_PRESET_CONFIG,
  catalogs,
  decodePreset,
  encodePreset,
  isPresetCode,
  type DesignSystemConfig,
} from "@bejamas/create-config/browser";
import type { ThemeStyles } from "../types/theme";
import { resolveDesignSystemTheme } from "./design-system-adapter";
import type { ThemeOverrides } from "./create-theme";
import type { ParsedThemeCookie, ThemeSwatches } from "./theme-cookie";

export interface HeaderPresetColorPair {
  primary: string;
  accent: string;
}

export interface HeaderPresetSwatches {
  light: HeaderPresetColorPair;
  dark: HeaderPresetColorPair;
}

export interface HeaderPresetSummary {
  id: string;
  label: string;
  swatches: HeaderPresetSwatches;
  createHref: string;
  themeRef: string | null;
}

export interface HeaderPresetOption extends HeaderPresetSummary {
  styles: ThemeStyles;
}

type CustomPresetLike = {
  name: string;
  styles: ThemeStyles;
};

export function getPresetLabel(
  config: Pick<DesignSystemConfig, "style" | "font">,
) {
  const styleLabel =
    catalogs.styles.find((style) => style.name === config.style)?.title ??
    config.style;
  const fontLabel =
    catalogs.fonts.find((font) => font.name === `font-${config.font}`)?.title ??
    config.font;

  return `${styleLabel} - ${fontLabel}`;
}

export function getSwatchesFromStyles(styles: {
  light: Partial<ThemeStyles["light"]>;
  dark: Partial<ThemeStyles["dark"]>;
}): HeaderPresetSwatches {
  return {
    light: {
      primary: styles.light.primary ?? "oklch(0.2 0 0)",
      accent: styles.light.accent ?? "oklch(0.7 0 0)",
    },
    dark: {
      primary: styles.dark.primary ?? "oklch(0.98 0 0)",
      accent: styles.dark.accent ?? "oklch(0.8 0 0)",
    },
  };
}

export function getSwatchesFromThemeCookie(
  swatches: ThemeSwatches,
): HeaderPresetSwatches {
  return {
    light: {
      primary: swatches.primaryLight,
      accent: swatches.accentLight,
    },
    dark: {
      primary: swatches.primaryDark,
      accent: swatches.accentDark,
    },
  };
}

export function getThemeSwatchesFromStyles(styles: ThemeStyles): ThemeSwatches {
  const swatches = getSwatchesFromStyles(styles);

  return {
    primaryLight: swatches.light.primary,
    accentLight: swatches.light.accent,
    primaryDark: swatches.dark.primary,
    accentDark: swatches.dark.accent,
  };
}

export function buildCreateHref(preset: string | null, themeRef: string | null) {
  const params = new URLSearchParams();

  if (preset) {
    params.set("preset", preset);
  }

  if (themeRef) {
    params.set("themeRef", themeRef);
  }

  const query = params.toString();
  return query ? `/create?${query}` : "/create";
}

export function buildResolvedPresetSummary(
  presetId: string,
  config: DesignSystemConfig,
  themeRef: string | null,
  themeOverrides?: Partial<ThemeOverrides> | null,
): HeaderPresetSummary {
  const resolved = resolveDesignSystemTheme(config, themeOverrides);

  return {
    id: presetId,
    label: getPresetLabel(config),
    swatches: getSwatchesFromStyles(resolved.styles),
    createHref: buildCreateHref(presetId, themeRef),
    themeRef,
  };
}

export function buildDefaultCurrentSummary() {
  return buildResolvedPresetSummary(
    encodePreset(DEFAULT_PRESET_CONFIG),
    DEFAULT_DESIGN_SYSTEM_CONFIG,
    null,
  );
}

function buildSummaryFromCustomPreset(
  presetId: string,
  preset: CustomPresetLike,
  themeRef: string | null,
): HeaderPresetSummary {
  return {
    id: presetId,
    label: preset.name,
    swatches: getSwatchesFromStyles(preset.styles),
    createHref: buildCreateHref(null, themeRef),
    themeRef,
  };
}

function buildDecodedPresetSummary(
  presetId: string,
  themeRef: string | null,
): HeaderPresetSummary | null {
  if (!isPresetCode(presetId)) {
    return null;
  }

  const decoded = decodePreset(presetId);
  if (!decoded) {
    return null;
  }

  return buildResolvedPresetSummary(
    presetId,
    {
      ...DEFAULT_DESIGN_SYSTEM_CONFIG,
      ...decoded,
    },
    themeRef,
  );
}

type ResolveHeaderPresetSelectionOptions = {
  current: HeaderPresetSummary | null;
  presets: HeaderPresetOption[];
  stored: ParsedThemeCookie | null;
  themeRef: string | null;
  customPresets?: Record<string, CustomPresetLike> | null;
};

export function resolveHeaderPresetSelection({
  current,
  presets,
  stored,
  themeRef,
  customPresets,
}: ResolveHeaderPresetSelectionOptions): {
  summary: HeaderPresetSummary | null;
  selectedPresetId: string | null;
} {
  if (!stored) {
    return {
      summary: current,
      selectedPresetId: null,
    };
  }

  const curatedPreset = themeRef
    ? null
    : presets.find((preset) => preset.id === stored.id) ?? null;
  if (curatedPreset) {
    return {
      summary: {
        id: curatedPreset.id,
        label: curatedPreset.label,
        swatches: curatedPreset.swatches,
        createHref: curatedPreset.createHref,
        themeRef: null,
      },
      selectedPresetId: curatedPreset.id,
    };
  }

  if (
    current &&
    stored.id === current.id &&
    themeRef === (current.themeRef ?? null)
  ) {
    return {
      summary: current,
      selectedPresetId: null,
    };
  }

  const customPreset = customPresets?.[stored.id] ?? null;
  const decodedPreset = buildDecodedPresetSummary(stored.id, themeRef);

  if (stored.swatches) {
    return {
      summary: {
        id: stored.id,
        label:
          stored.name ??
          customPreset?.name ??
          decodedPreset?.label ??
          current?.label ??
          stored.id,
        swatches: getSwatchesFromThemeCookie(stored.swatches),
        createHref: buildCreateHref(
          isPresetCode(stored.id) ? stored.id : null,
          themeRef,
        ),
        themeRef,
      },
      selectedPresetId: null,
    };
  }

  if (customPreset) {
    return {
      summary: buildSummaryFromCustomPreset(stored.id, customPreset, themeRef),
      selectedPresetId: null,
    };
  }

  if (decodedPreset) {
    return {
      summary: decodedPreset,
      selectedPresetId: null,
    };
  }

  return {
    summary: current ?? buildDefaultCurrentSummary(),
    selectedPresetId: null,
  };
}
