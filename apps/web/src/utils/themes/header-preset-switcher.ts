import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  catalogs,
  decodePreset,
  encodePreset,
  isPresetCode,
  type DesignSystemConfig,
} from "@bejamas/create-config/server";
import type { ThemeStyles } from "@/types/theme";
import { type ThemeOverrides } from "./create-theme";
import { getThemeOverridesByRef } from "./create-theme.server";
import { resolveDesignSystemTheme } from "./design-system-adapter";
import { defaultPresets } from "./presets";
import { parseThemeCookie, type ThemeSwatches } from "./theme-cookie";

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

export interface HeaderPresetSwitcherState {
  current: HeaderPresetSummary;
  presets: HeaderPresetOption[];
  selectedPresetId: string | null;
}

type CuratedPresetDefinition = {
  config: DesignSystemConfig;
};

const CURATED_HEADER_PRESET_DEFINITIONS = [
  {
    config: {
      style: "juno",
      baseColor: "neutral",
      theme: "indigo",
      iconLibrary: "lucide",
      font: "inter",
      radius: "default",
      menuColor: "default",
      menuAccent: "subtle",
      template: "astro",
      rtl: false,
      rtlLanguage: "ar",
    },
  },
  {
    config: {
      style: "vega",
      baseColor: "olive",
      theme: "amber",
      iconLibrary: "lucide",
      font: "playfair-display",
      radius: "default",
      menuColor: "default",
      menuAccent: "subtle",
      template: "astro",
      rtl: false,
      rtlLanguage: "ar",
    },
  },
  {
    config: {
      style: "lyra",
      baseColor: "zinc",
      theme: "cyan",
      iconLibrary: "lucide",
      font: "geist-mono",
      radius: "default",
      menuColor: "default",
      menuAccent: "subtle",
      template: "astro",
      rtl: false,
      rtlLanguage: "ar",
    },
  },
] as const satisfies readonly CuratedPresetDefinition[];

function getPresetLabel(config: Pick<DesignSystemConfig, "style" | "font">) {
  const styleLabel =
    catalogs.styles.find((style) => style.name === config.style)?.title ??
    config.style;
  const fontLabel =
    catalogs.fonts.find((font) => font.name === `font-${config.font}`)?.title ??
    config.font;

  return `${styleLabel} - ${fontLabel}`;
}

function getSwatchesFromStyles(styles: ThemeStyles): HeaderPresetSwatches {
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

function getSwatchesFromThemeCookie(
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

function buildCreateHref(preset: string | null, themeRef: string | null) {
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

function buildResolvedPresetSummary(
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

function buildCuratedPresetOption(
  definition: CuratedPresetDefinition,
): HeaderPresetOption {
  const presetId = encodePreset(definition.config);
  const resolved = resolveDesignSystemTheme(definition.config);

  return {
    id: presetId,
    label: getPresetLabel(definition.config),
    swatches: getSwatchesFromStyles(resolved.styles),
    createHref: buildCreateHref(presetId, null),
    themeRef: null,
    styles: resolved.styles,
  };
}

function buildDefaultCurrentSummary(): HeaderPresetSummary {
  return buildResolvedPresetSummary(
    encodePreset(DEFAULT_DESIGN_SYSTEM_CONFIG),
    DEFAULT_DESIGN_SYSTEM_CONFIG,
    null,
  );
}

function buildLegacySummary(
  themeId: string,
  swatches?: ThemeSwatches,
  name?: string,
  themeRef?: string | null,
): HeaderPresetSummary {
  const preset = defaultPresets[themeId];

  return {
    id: themeId,
    label:
      name ??
      preset?.label ??
      (themeId.startsWith("shared-")
        ? "Shared Theme"
        : themeId.startsWith("custom-")
          ? "Custom Theme"
          : themeId),
    swatches: swatches
      ? getSwatchesFromThemeCookie(swatches)
      : preset
        ? getSwatchesFromStyles(preset.styles)
        : buildDefaultCurrentSummary().swatches,
    createHref: buildCreateHref(null, themeRef ?? null),
    themeRef: themeRef ?? null,
  };
}

export function buildHeaderPresetSwitcherState(options: {
  themeCookieValue?: string | null;
  themeRef?: string | null;
  themeOverrides?: Partial<ThemeOverrides> | null;
}): HeaderPresetSwitcherState {
  const presets = CURATED_HEADER_PRESET_DEFINITIONS.map(
    buildCuratedPresetOption,
  );
  const themeCookieValue = options.themeCookieValue ?? null;
  const themeRef = options.themeRef ?? null;

  if (!themeCookieValue) {
    return {
      current: {
        ...buildDefaultCurrentSummary(),
        createHref: buildCreateHref(
          encodePreset(DEFAULT_DESIGN_SYSTEM_CONFIG),
          themeRef,
        ),
        themeRef,
      },
      presets,
      selectedPresetId: null,
    };
  }

  const parsed = parseThemeCookie(themeCookieValue);
  if (!isPresetCode(parsed.id)) {
    return {
      current: buildLegacySummary(
        parsed.id,
        parsed.swatches,
        parsed.name,
        themeRef,
      ),
      presets,
      selectedPresetId: null,
    };
  }

  const decoded = decodePreset(parsed.id);
  if (!decoded) {
    return {
      current: buildDefaultCurrentSummary(),
      presets,
      selectedPresetId: null,
    };
  }

  const config = {
    ...DEFAULT_DESIGN_SYSTEM_CONFIG,
    ...decoded,
  } satisfies DesignSystemConfig;
  const current = buildResolvedPresetSummary(
    parsed.id,
    config,
    themeRef,
    options.themeOverrides,
  );
  const selectedPresetId = themeRef
    ? null
    : (presets.find((preset) => preset.id === parsed.id)?.id ?? null);

  return { current, presets, selectedPresetId };
}

export async function getHeaderPresetSwitcherState(options: {
  themeCookieValue?: string | null;
  themeRef?: string | null;
}) {
  const themeRef = options.themeRef ?? null;
  const themeOverrides = await getThemeOverridesByRef(themeRef);

  return buildHeaderPresetSwitcherState({
    themeCookieValue: options.themeCookieValue,
    themeRef,
    themeOverrides,
  });
}
