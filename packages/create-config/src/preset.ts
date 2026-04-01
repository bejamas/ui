// Preset encoding/decoding utilities.
// Bit-packs design system params into a single integer,
// then encodes as base62 with a version prefix character.
//
// Rules for backward compat:
//   1. Never reorder existing values inside a given version.
//   2. New fields must have their default at index 0.
//   3. Only append new fields to the end of PRESET_FIELDS.
//   4. Stay under 53 bits total (JS safe integer limit).

export const PRESET_STYLES = [
  "nova",
  "vega",
  "maia",
  "lyra",
  "mira",
  "luma",
  "juno",
] as const;

export const SHARED_PRESET_STYLES = [
  "nova",
  "vega",
  "maia",
  "lyra",
  "mira",
  "luma",
] as const;

export const LEGACY_PRESET_STYLES = [
  "nova",
  "vega",
  "maia",
  "lyra",
  "mira",
  "juno",
] as const;

export const PRESET_VERSION_C_STYLES = [
  ...LEGACY_PRESET_STYLES,
  "luma",
] as const;

export const PRESET_BASE_COLORS = [
  "neutral",
  "stone",
  "zinc",
  "gray",
  "mauve",
  "olive",
  "mist",
  "taupe",
] as const;

const SHARED_PRESET_THEMES = [
  "neutral",
  "stone",
  "zinc",
  "gray",
  "amber",
  "blue",
  "cyan",
  "emerald",
  "fuchsia",
  "green",
  "indigo",
  "lime",
  "orange",
  "pink",
  "purple",
  "red",
  "rose",
  "sky",
  "teal",
  "violet",
  "yellow",
  "mauve",
  "olive",
  "mist",
  "taupe",
] as const;

export const PRESET_THEMES = [
  ...SHARED_PRESET_THEMES,
  "bejamas-blue",
  "bejamas-neon-yellow",
  "bejamas-apple",
  "bejamas-orange",
  "bejamas-sunflower",
  "bejamas-violet",
  "bejamas-turquoise",
  "bejamas-magenta",
] as const;

export const PRESET_CHART_COLORS = SHARED_PRESET_THEMES;

export const V1_CHART_COLOR_MAP: Partial<
  Record<
    (typeof PRESET_BASE_COLORS)[number],
    (typeof PRESET_CHART_COLORS)[number]
  >
> = {
  neutral: "blue",
  stone: "lime",
  zinc: "amber",
  mauve: "emerald",
  olive: "violet",
  mist: "rose",
  taupe: "cyan",
};

export const PRESET_ICON_LIBRARIES = [
  "lucide",
  "hugeicons",
  "tabler",
  "phosphor",
  "remixicon",
] as const;

export const PRESET_FONTS = [
  "inter",
  "noto-sans",
  "nunito-sans",
  "figtree",
  "roboto",
  "raleway",
  "dm-sans",
  "public-sans",
  "outfit",
  "jetbrains-mono",
  "geist",
  "geist-mono",
  "lora",
  "merriweather",
  "playfair-display",
  "noto-serif",
  "roboto-slab",
  "oxanium",
  "manrope",
  "space-grotesk",
  "montserrat",
  "ibm-plex-sans",
  "source-sans-3",
  "instrument-sans",
] as const;

export const PRESET_FONT_HEADINGS = ["inherit", ...PRESET_FONTS] as const;

export const PRESET_RADII = [
  "default",
  "none",
  "small",
  "medium",
  "large",
] as const;

export const PRESET_MENU_ACCENTS = ["subtle", "bold"] as const;

export const PRESET_MENU_COLORS = [
  "default",
  "inverted",
  "default-translucent",
  "inverted-translucent",
] as const;

type PresetFieldKey =
  | "style"
  | "baseColor"
  | "theme"
  | "chartColor"
  | "iconLibrary"
  | "font"
  | "fontHeading"
  | "radius"
  | "menuAccent"
  | "menuColor";

type PresetVersion = "a" | "b" | "c";

type PresetFieldDefinition = {
  key: PresetFieldKey;
  values: readonly string[];
  bits: number;
};

type PresetVersionDefinition = {
  version: PresetVersion;
  fields: readonly PresetFieldDefinition[];
  kind: "shadcn-v1" | "shadcn-v2" | "bejamas-v2" | "bejamas-v3";
};

const PRESET_FIELDS_A = [
  { key: "menuColor", values: PRESET_MENU_COLORS, bits: 3 },
  { key: "menuAccent", values: PRESET_MENU_ACCENTS, bits: 3 },
  { key: "radius", values: PRESET_RADII, bits: 4 },
  { key: "font", values: PRESET_FONTS, bits: 6 },
  { key: "iconLibrary", values: PRESET_ICON_LIBRARIES, bits: 6 },
  { key: "theme", values: SHARED_PRESET_THEMES, bits: 6 },
  { key: "baseColor", values: PRESET_BASE_COLORS, bits: 6 },
  { key: "style", values: SHARED_PRESET_STYLES, bits: 6 },
] as const satisfies readonly PresetFieldDefinition[];

const PRESET_FIELDS_B_SHARED = [
  ...PRESET_FIELDS_A,
  { key: "chartColor", values: PRESET_CHART_COLORS, bits: 6 },
  { key: "fontHeading", values: PRESET_FONT_HEADINGS, bits: 5 },
] as const satisfies readonly PresetFieldDefinition[];

const PRESET_FIELDS_B_LEGACY = [
  { key: "menuColor", values: PRESET_MENU_COLORS, bits: 3 },
  { key: "menuAccent", values: PRESET_MENU_ACCENTS, bits: 3 },
  { key: "radius", values: PRESET_RADII, bits: 4 },
  { key: "font", values: PRESET_FONTS, bits: 6 },
  { key: "iconLibrary", values: PRESET_ICON_LIBRARIES, bits: 6 },
  { key: "theme", values: PRESET_THEMES, bits: 6 },
  { key: "baseColor", values: PRESET_BASE_COLORS, bits: 6 },
  { key: "style", values: LEGACY_PRESET_STYLES, bits: 6 },
] as const satisfies readonly PresetFieldDefinition[];

const PRESET_FIELDS_C = [
  { key: "menuColor", values: PRESET_MENU_COLORS, bits: 3 },
  { key: "menuAccent", values: PRESET_MENU_ACCENTS, bits: 3 },
  { key: "radius", values: PRESET_RADII, bits: 4 },
  { key: "font", values: PRESET_FONTS, bits: 6 },
  { key: "iconLibrary", values: PRESET_ICON_LIBRARIES, bits: 6 },
  { key: "theme", values: PRESET_THEMES, bits: 6 },
  { key: "baseColor", values: PRESET_BASE_COLORS, bits: 6 },
  { key: "style", values: PRESET_VERSION_C_STYLES, bits: 6 },
  { key: "fontHeading", values: PRESET_FONT_HEADINGS, bits: 5 },
] as const satisfies readonly PresetFieldDefinition[];

const PRESET_VERSION_A = {
  version: "a",
  fields: PRESET_FIELDS_A,
  kind: "shadcn-v1",
} as const satisfies PresetVersionDefinition;

const PRESET_VERSION_B_SHARED = {
  version: "b",
  fields: PRESET_FIELDS_B_SHARED,
  kind: "shadcn-v2",
} as const satisfies PresetVersionDefinition;

const PRESET_VERSION_B_LEGACY = {
  version: "b",
  fields: PRESET_FIELDS_B_LEGACY,
  kind: "bejamas-v2",
} as const satisfies PresetVersionDefinition;

const PRESET_VERSION_C = {
  version: "c",
  fields: PRESET_FIELDS_C,
  kind: "bejamas-v3",
} as const satisfies PresetVersionDefinition;

const PRESET_ENCODERS = [
  PRESET_VERSION_B_SHARED,
  PRESET_VERSION_B_LEGACY,
  PRESET_VERSION_C,
] as const;

const PRESET_VERSION_MAP = new Map([
  ["a", PRESET_VERSION_A],
  ["c", PRESET_VERSION_C],
]);

const VALID_VERSIONS = ["a", "b", "c"] as const;
const MAX_LEGACY_B_PRESET_LENGTH = 8;

export type PresetConfig = {
  style: (typeof PRESET_STYLES)[number];
  baseColor: (typeof PRESET_BASE_COLORS)[number];
  theme: (typeof PRESET_THEMES)[number];
  chartColor?: (typeof PRESET_CHART_COLORS)[number];
  iconLibrary: (typeof PRESET_ICON_LIBRARIES)[number];
  font: (typeof PRESET_FONTS)[number];
  fontHeading: (typeof PRESET_FONT_HEADINGS)[number];
  radius: (typeof PRESET_RADII)[number];
  menuAccent: (typeof PRESET_MENU_ACCENTS)[number];
  menuColor: (typeof PRESET_MENU_COLORS)[number];
};

export const DEFAULT_PRESET_CONFIG: PresetConfig = {
  style: "juno",
  baseColor: "neutral",
  theme: "bejamas-blue",
  iconLibrary: "lucide",
  font: "inter",
  fontHeading: "inherit",
  radius: "default",
  menuAccent: "subtle",
  menuColor: "default",
};

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function toBase62(num: number) {
  if (num === 0) {
    return "0";
  }

  let result = "";
  let current = num;

  while (current > 0) {
    result = BASE62[current % 62] + result;
    current = Math.floor(current / 62);
  }

  return result;
}

export function fromBase62(value: string) {
  let result = 0;

  for (let index = 0; index < value.length; index += 1) {
    const charIndex = BASE62.indexOf(value[index]);
    if (charIndex === -1) {
      return -1;
    }

    result = result * 62 + charIndex;
  }

  return result;
}

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

function hasValue<T extends readonly string[]>(
  values: T,
  value: string | undefined,
): value is T[number] {
  return value !== undefined && values.includes(value);
}

function isBejamasOnlyTheme(
  value: string | undefined,
): value is Exclude<(typeof PRESET_THEMES)[number], (typeof SHARED_PRESET_THEMES)[number]> {
  return !!value && value.startsWith("bejamas-");
}

function resolveChartColorValue(
  config: Partial<PresetConfig>,
): (typeof PRESET_CHART_COLORS)[number] {
  if (hasValue(PRESET_CHART_COLORS, config.chartColor)) {
    return config.chartColor;
  }

  if (hasValue(PRESET_BASE_COLORS, config.theme)) {
    return V1_CHART_COLOR_MAP[config.theme] ?? config.theme;
  }

  if (hasValue(PRESET_CHART_COLORS, config.theme)) {
    return config.theme;
  }

  return PRESET_CHART_COLORS[0];
}

function normalizePresetConfig(config: Partial<PresetConfig>): PresetConfig {
  const merged = {
    ...DEFAULT_PRESET_CONFIG,
    ...config,
  };
  const normalizedFontHeading =
    merged.fontHeading === merged.font ? "inherit" : merged.fontHeading;

  return omitUndefined({
    ...merged,
    fontHeading: normalizedFontHeading,
    chartColor: hasValue(PRESET_CHART_COLORS, merged.chartColor)
      ? merged.chartColor
      : undefined,
  }) as PresetConfig;
}

function getEncodedFieldValue(
  config: PresetConfig,
  field: PresetFieldDefinition,
  version: PresetVersionDefinition,
) {
  if (field.key === "chartColor") {
    return resolveChartColorValue(config);
  }

  return config[field.key];
}

function canEncodeWithVersion(
  config: PresetConfig,
  version: PresetVersionDefinition,
) {
  // Reserve legacy b-codes for Bejamas-only themes. Shared b-codes now follow
  // upstream shadcn ordering, so using legacy b for shared themes would collide
  // with upstream luma presets.
  if (version.kind === "bejamas-v2" && !isBejamasOnlyTheme(config.theme)) {
    return false;
  }

  if (
    version.kind !== "shadcn-v2" &&
    hasValue(PRESET_CHART_COLORS, config.chartColor)
  ) {
    return false;
  }

  if (
    version.kind !== "shadcn-v2" &&
    version.kind !== "bejamas-v3" &&
    config.fontHeading !== DEFAULT_PRESET_CONFIG.fontHeading
  ) {
    return false;
  }

  return version.fields.every((field) =>
    field.values.includes(getEncodedFieldValue(config, field, version)),
  );
}

function encodePresetWithVersion(
  config: PresetConfig,
  version: PresetVersionDefinition,
) {
  let bits = 0;
  let offset = 0;

  for (const field of version.fields) {
    const index = field.values.indexOf(getEncodedFieldValue(config, field, version));
    bits += (index === -1 ? 0 : index) * 2 ** offset;
    offset += field.bits;
  }

  return version.version + toBase62(bits);
}

function decodePresetWithVersion(
  code: string,
  version: PresetVersionDefinition,
): Partial<PresetConfig> | null {
  const bits = fromBase62(code.slice(1));
  if (bits < 0) {
    return null;
  }

  const result = {} as Record<string, string>;
  let offset = 0;

  for (const field of version.fields) {
    const index = Math.floor(bits / 2 ** offset) % 2 ** field.bits;
    result[field.key] =
      index < field.values.length ? field.values[index] : field.values[0];
    offset += field.bits;
  }

  return result as Partial<PresetConfig>;
}

function normalizeDecodedPreset(
  decoded: Partial<PresetConfig>,
): PresetConfig {
  return normalizePresetConfig(decoded);
}

function shouldDecodeLegacyBejamasB(code: string) {
  if (code.length > MAX_LEGACY_B_PRESET_LENGTH) {
    return false;
  }

  const decoded = decodePresetWithVersion(code, PRESET_VERSION_B_LEGACY);
  if (!decoded) {
    return false;
  }

  return isBejamasOnlyTheme(decoded.theme);
}

export function encodePreset(config: Partial<PresetConfig>) {
  const merged = normalizePresetConfig(config);

  for (const version of PRESET_ENCODERS) {
    if (canEncodeWithVersion(merged, version)) {
      return encodePresetWithVersion(merged, version);
    }
  }

  throw new Error(
    `Unsupported preset config: ${JSON.stringify(merged)}`,
  );
}

export function decodePreset(code: string): PresetConfig | null {
  if (!code || code.length < 2) {
    return null;
  }

  const version = code[0] as (typeof VALID_VERSIONS)[number];
  if (!VALID_VERSIONS.includes(version)) {
    return null;
  }

  if (version === "b") {
    const presetVersion = shouldDecodeLegacyBejamasB(code)
      ? PRESET_VERSION_B_LEGACY
      : PRESET_VERSION_B_SHARED;
    const decoded = decodePresetWithVersion(code, presetVersion);

    return decoded ? normalizeDecodedPreset(decoded) : null;
  }

  const presetVersion = PRESET_VERSION_MAP.get(version);
  if (!presetVersion) {
    return null;
  }

  const decoded = decodePresetWithVersion(code, presetVersion);

  return decoded ? normalizeDecodedPreset(decoded) : null;
}

export function isPresetCode(value: string) {
  if (!value || value.length < 2 || value.length > 10) {
    return false;
  }

  if (!VALID_VERSIONS.includes(value[0] as (typeof VALID_VERSIONS)[number])) {
    return false;
  }

  for (let index = 1; index < value.length; index += 1) {
    if (!BASE62.includes(value[index])) {
      return false;
    }
  }

  return true;
}
