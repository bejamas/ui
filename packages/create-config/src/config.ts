import { z } from "zod";
import { BASE_COLORS } from "./catalog/base-colors";
import { fonts } from "./catalog/fonts";
import { STYLES } from "./catalog/styles";
import { THEMES } from "./catalog/themes";
import {
  DEFAULT_PRESET_CONFIG,
  PRESET_ICON_LIBRARIES,
  PRESET_MENU_ACCENTS,
  PRESET_MENU_COLORS,
  PRESET_RADII,
  type PresetConfig,
} from "./preset";

export const TEMPLATE_VALUES = [
  "astro",
  "astro-monorepo",
  "astro-with-component-docs-monorepo",
] as const;

export type TemplateValue = (typeof TEMPLATE_VALUES)[number];

const FONT_VALUES = fonts.map((font) => font.name.replace("font-", "")) as [
  string,
  ...string[],
];

export const designSystemConfigSchema = z
  .object({
    style: z.enum(STYLES.map((style) => style.name) as [string, ...string[]]),
    baseColor: z.enum(
      BASE_COLORS.map((color) => color.name) as [string, ...string[]],
    ),
    theme: z.enum(THEMES.map((theme) => theme.name) as [string, ...string[]]),
    iconLibrary: z.enum(PRESET_ICON_LIBRARIES),
    font: z.enum(FONT_VALUES),
    radius: z.enum(PRESET_RADII),
    menuAccent: z.enum(PRESET_MENU_ACCENTS),
    menuColor: z.enum(PRESET_MENU_COLORS),
    template: z.enum(TEMPLATE_VALUES).default("astro"),
    rtl: z.boolean().default(false),
  })
  .superRefine((config, context) => {
    if (
      !getThemesForBaseColor(config.baseColor).some(
        (theme) => theme.name === config.theme,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: `Theme "${config.theme}" is not available for base color "${config.baseColor}".`,
        path: ["theme"],
      });
    }
  });

export type DesignSystemConfig = z.infer<typeof designSystemConfigSchema>;

export const DEFAULT_DESIGN_SYSTEM_CONFIG: DesignSystemConfig = {
  ...DEFAULT_PRESET_CONFIG,
  template: "astro",
  rtl: false,
};

const RADIUS_VALUES = {
  default: "0.625rem",
  none: "0",
  small: "0.45rem",
  medium: "0.625rem",
  large: "0.875rem",
} as const satisfies Record<DesignSystemConfig["radius"], string>;

const STYLE_DEFAULT_RADII = {
  bejamas: "default",
  vega: "default",
  nova: "default",
  lyra: "none",
  maia: "large",
  mira: "default",
} as const satisfies Record<
  DesignSystemConfig["style"],
  DesignSystemConfig["radius"]
>;

export function getThemesForBaseColor(baseColorName: string) {
  const baseColorNames = BASE_COLORS.map((baseColor) => baseColor.name);

  return THEMES.filter((theme) => {
    if (theme.name === baseColorName) {
      return true;
    }

    return !baseColorNames.includes(theme.name);
  });
}

export function getBaseColor(name: DesignSystemConfig["baseColor"]) {
  return BASE_COLORS.find((color) => color.name === name);
}

export function getTheme(name: DesignSystemConfig["theme"]) {
  return THEMES.find((theme) => theme.name === name);
}

export function getStyle(name: DesignSystemConfig["style"]) {
  return STYLES.find((style) => style.name === name);
}

export function getStyleId(style: DesignSystemConfig["style"]) {
  return `bejamas-${style}`;
}

export function getStyleDefaultRadius(style: DesignSystemConfig["style"]) {
  return STYLE_DEFAULT_RADII[style as keyof typeof STYLE_DEFAULT_RADII];
}

export function resolveEffectiveRadius(
  style: DesignSystemConfig["style"],
  radius: DesignSystemConfig["radius"],
) {
  return radius === "default" ? getStyleDefaultRadius(style) : radius;
}

export function getRadiusValue(radius: DesignSystemConfig["radius"]) {
  return RADIUS_VALUES[radius];
}

export function getFontValue(name: DesignSystemConfig["font"]) {
  return fonts.find((font) => font.name === `font-${name}`);
}

export function getFontPackageName(name: DesignSystemConfig["font"]) {
  return `@fontsource-variable/${name}`;
}

export function mergeDesignSystemConfig(
  partial?: Partial<DesignSystemConfig> & Partial<PresetConfig>,
) {
  return designSystemConfigSchema.parse({
    ...DEFAULT_DESIGN_SYSTEM_CONFIG,
    ...partial,
  });
}
