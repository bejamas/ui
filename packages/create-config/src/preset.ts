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
  "juno",
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

export const PRESET_THEMES = [
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
] as const;

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
  | "iconLibrary"
  | "font"
  | "radius"
  | "menuAccent"
  | "menuColor";

type PresetFieldDefinition = {
  key: PresetFieldKey;
  values: readonly string[];
  bits: number;
};

type PresetVersionDefinition = {
  version: "a" | "b";
  fields: readonly PresetFieldDefinition[];
};

const PRESET_FIELDS_A = [
  { key: "menuColor", values: PRESET_MENU_COLORS, bits: 3 },
  { key: "menuAccent", values: PRESET_MENU_ACCENTS, bits: 3 },
  { key: "radius", values: PRESET_RADII, bits: 4 },
  { key: "font", values: PRESET_FONTS, bits: 6 },
  { key: "iconLibrary", values: PRESET_ICON_LIBRARIES, bits: 6 },
  { key: "theme", values: PRESET_THEMES, bits: 6 },
  { key: "baseColor", values: PRESET_BASE_COLORS, bits: 6 },
  {
    key: "style",
    values: ["nova", "vega", "maia", "lyra", "mira"] as const,
    bits: 6,
  },
] as const satisfies readonly PresetFieldDefinition[];

const PRESET_FIELDS_B = [
  { key: "menuColor", values: PRESET_MENU_COLORS, bits: 3 },
  { key: "menuAccent", values: PRESET_MENU_ACCENTS, bits: 3 },
  { key: "radius", values: PRESET_RADII, bits: 4 },
  { key: "font", values: PRESET_FONTS, bits: 6 },
  { key: "iconLibrary", values: PRESET_ICON_LIBRARIES, bits: 6 },
  { key: "theme", values: PRESET_THEMES, bits: 6 },
  { key: "baseColor", values: PRESET_BASE_COLORS, bits: 6 },
  { key: "style", values: PRESET_STYLES, bits: 6 },
] as const satisfies readonly PresetFieldDefinition[];

const PRESET_VERSIONS = [
  {
    version: "a",
    fields: PRESET_FIELDS_A,
  },
  {
    version: "b",
    fields: PRESET_FIELDS_B,
  },
] as const satisfies readonly PresetVersionDefinition[];

const PRESET_VERSION_MAP = new Map(
  PRESET_VERSIONS.map((version) => [version.version, version]),
);

export type PresetConfig = {
  style: (typeof PRESET_STYLES)[number];
  baseColor: (typeof PRESET_BASE_COLORS)[number];
  theme: (typeof PRESET_THEMES)[number];
  iconLibrary: (typeof PRESET_ICON_LIBRARIES)[number];
  font: (typeof PRESET_FONTS)[number];
  radius: (typeof PRESET_RADII)[number];
  menuAccent: (typeof PRESET_MENU_ACCENTS)[number];
  menuColor: (typeof PRESET_MENU_COLORS)[number];
};

export const DEFAULT_PRESET_CONFIG: PresetConfig = {
  style: "juno",
  baseColor: "neutral",
  theme: "neutral",
  iconLibrary: "lucide",
  font: "geist",
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

function canEncodeWithVersion(
  config: PresetConfig,
  version: PresetVersionDefinition,
) {
  return version.fields.every((field) =>
    field.values.includes(config[field.key]),
  );
}

function encodePresetWithVersion(
  config: PresetConfig,
  version: PresetVersionDefinition,
) {
  let bits = 0;
  let offset = 0;

  for (const field of version.fields) {
    const index = field.values.indexOf(config[field.key]);
    bits += (index === -1 ? 0 : index) * 2 ** offset;
    offset += field.bits;
  }

  return version.version + toBase62(bits);
}

function decodePresetWithVersion(
  code: string,
  version: PresetVersionDefinition,
): PresetConfig | null {
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

  return result as PresetConfig;
}

export function encodePreset(config: Partial<PresetConfig>) {
  const merged = { ...DEFAULT_PRESET_CONFIG, ...config };

  for (const version of PRESET_VERSIONS) {
    if (canEncodeWithVersion(merged, version)) {
      return encodePresetWithVersion(merged, version);
    }
  }

  return encodePresetWithVersion(
    merged,
    PRESET_VERSIONS[PRESET_VERSIONS.length - 1],
  );
}

export function decodePreset(code: string): PresetConfig | null {
  if (!code || code.length < 2) {
    return null;
  }

  const version = PRESET_VERSION_MAP.get(code[0] as "a" | "b");
  if (!version) {
    return null;
  }

  return decodePresetWithVersion(code, version);
}

export function isPresetCode(value: string) {
  if (!value || value.length < 2 || value.length > 10) {
    return false;
  }

  if (!PRESET_VERSION_MAP.has(value[0] as "a" | "b")) {
    return false;
  }

  for (let index = 1; index < value.length; index += 1) {
    if (!BASE62.includes(value[index])) {
      return false;
    }
  }

  return true;
}
