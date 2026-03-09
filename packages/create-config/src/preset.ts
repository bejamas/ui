export const PRESET_STYLES = [
  "nova",
  "vega",
  "lyra",
  "juno",
  "maia",
  "mira",
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
export const PRESET_MENU_COLORS = ["default", "inverted"] as const;

const PRESET_FIELDS = [
  { key: "menuColor", values: PRESET_MENU_COLORS, bits: 3 },
  { key: "menuAccent", values: PRESET_MENU_ACCENTS, bits: 3 },
  { key: "radius", values: PRESET_RADII, bits: 4 },
  { key: "font", values: PRESET_FONTS, bits: 6 },
  { key: "iconLibrary", values: PRESET_ICON_LIBRARIES, bits: 6 },
  { key: "theme", values: PRESET_THEMES, bits: 6 },
  { key: "baseColor", values: PRESET_BASE_COLORS, bits: 6 },
  { key: "style", values: PRESET_STYLES, bits: 6 },
] as const;

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
const VERSION_CHAR = "a";

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

export function encodePreset(config: Partial<PresetConfig>) {
  const merged = { ...DEFAULT_PRESET_CONFIG, ...config };
  let bits = 0;
  let offset = 0;

  for (const field of PRESET_FIELDS) {
    const index = (field.values as readonly string[]).indexOf(
      merged[field.key as keyof PresetConfig],
    );

    bits += (index === -1 ? 0 : index) * 2 ** offset;
    offset += field.bits;
  }

  return VERSION_CHAR + toBase62(bits);
}

export function decodePreset(code: string): PresetConfig | null {
  if (!code || code.length < 2 || code[0] !== VERSION_CHAR) {
    return null;
  }

  const bits = fromBase62(code.slice(1));
  if (bits < 0) {
    return null;
  }

  const result = {} as Record<string, string>;
  let offset = 0;

  for (const field of PRESET_FIELDS) {
    const index = Math.floor(bits / 2 ** offset) % 2 ** field.bits;
    result[field.key] =
      index < field.values.length ? field.values[index] : field.values[0];
    offset += field.bits;
  }

  return result as PresetConfig;
}

export function isPresetCode(value: string) {
  if (!value || value.length < 2 || value.length > 10 || value[0] !== VERSION_CHAR) {
    return false;
  }

  for (let index = 1; index < value.length; index += 1) {
    if (!BASE62.includes(value[index])) {
      return false;
    }
  }

  return true;
}
