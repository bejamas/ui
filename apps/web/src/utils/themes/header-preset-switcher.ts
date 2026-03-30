import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  DEFAULT_PRESET_CONFIG,
  decodePreset,
  encodePreset,
  isPresetCode,
  type DesignSystemConfig,
  type PresetConfig,
} from "@bejamas/create-config/server";
import { type ThemeOverrides } from "./create-theme";
import { getThemeOverridesByRef } from "./create-theme.server";
import { resolveDesignSystemTheme } from "./design-system-adapter";
import { defaultPresets } from "./presets";
import { parseThemeCookie, type ThemeSwatches } from "./theme-cookie";
import {
  type HeaderPresetOption,
  type HeaderPresetSummary,
  buildCreateHref,
  buildDefaultCurrentSummary,
  buildResolvedPresetSummary,
  getPresetLabel,
  getSwatchesFromStyles,
  getSwatchesFromThemeCookie,
} from "./header-preset-summary";

export interface HeaderPresetSwitcherState {
  current: HeaderPresetSummary;
  presets: HeaderPresetOption[];
  selectedPresetId: string | null;
}

type CuratedPresetDefinition = {
  config: DesignSystemConfig;
};

function toPresetConfig(config: DesignSystemConfig): Partial<PresetConfig> {
  return {
    style: config.style,
    baseColor: config.baseColor,
    theme: config.theme,
    iconLibrary: config.iconLibrary,
    font: config.font,
    fontHeading: config.fontHeading,
    radius: config.radius,
    menuAccent: config.menuAccent,
    menuColor: config.menuColor,
  } as Partial<PresetConfig>;
}

const CURATED_HEADER_PRESET_DEFINITIONS = [
  {
    config: {
      style: "juno",
      baseColor: "neutral",
      theme: "blue",
      iconLibrary: "lucide",
      font: "inter",
      fontHeading: "inherit",
      radius: "default",
      menuColor: "default-translucent",
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
      fontHeading: "inherit",
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
      fontHeading: "inherit",
      radius: "default",
      menuColor: "default",
      menuAccent: "subtle",
      template: "astro",
      rtl: false,
      rtlLanguage: "ar",
    },
  },
] as const satisfies readonly CuratedPresetDefinition[];

function buildCuratedPresetOption(
  definition: CuratedPresetDefinition,
): HeaderPresetOption {
  const presetId = encodePreset(toPresetConfig(definition.config));
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
          encodePreset(DEFAULT_PRESET_CONFIG),
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
