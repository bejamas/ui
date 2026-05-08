import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  decodePreset,
  isPresetCode,
  type DesignSystemConfig,
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

const CURATED_HEADER_PRESET_CODES = [
  "c2WNn9RMO",
  "b4YFDQACWW",
  "c6FTeuysS",
  "c6aKQ9BCK",
  "bwR6bIG",
] as const;

function buildCuratedPresetOption(presetId: string): HeaderPresetOption {
  const decoded = decodePreset(presetId);
  if (!decoded) {
    throw new Error(`Invalid curated header preset: ${presetId}`);
  }

  const config = {
    ...DEFAULT_DESIGN_SYSTEM_CONFIG,
    ...decoded,
  } satisfies DesignSystemConfig;
  const resolved = resolveDesignSystemTheme(config);

  return {
    id: presetId,
    label: getPresetLabel(config),
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
  const presets = CURATED_HEADER_PRESET_CODES.map(buildCuratedPresetOption);
  const themeCookieValue = options.themeCookieValue ?? null;
  const themeRef = options.themeRef ?? null;

  if (!themeCookieValue) {
    const current = buildDefaultCurrentSummary();

    return {
      current: {
        ...current,
        createHref: buildCreateHref(current.id, themeRef),
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
