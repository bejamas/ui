import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  STYLES,
  TEMPLATE_VALUES,
  catalogs,
  getThemesForBaseColor,
  resolveEffectiveRadius,
  type DesignSystemConfig,
} from "@bejamas/create-config/browser";

export type CreatePickerName =
  | "style"
  | "baseColor"
  | "theme"
  | "iconLibrary"
  | "font"
  | "radius"
  | "menuColor"
  | "menuAccent"
  | "template";

export type CreatePickerMarkerKind =
  | "style"
  | "swatch"
  | "icon-library"
  | "font"
  | "radius"
  | "menu-color"
  | "menu-accent"
  | "template";

export type CreatePickerOption = {
  value: string;
  label: string;
  description?: string;
  group?: "bejamas" | "shadcn";
  color?: string;
  family?: string;
  markerValue?: string;
};

export type CreatePickerGroup = {
  group: keyof typeof CREATE_PICKER_GROUP_LABELS;
  label: (typeof CREATE_PICKER_GROUP_LABELS)[keyof typeof CREATE_PICKER_GROUP_LABELS];
  options: CreatePickerOption[];
};

export const CREATE_PICKER_GROUP_LABELS = {
  bejamas: "Bejamas",
  shadcn: "shadcn",
} as const;

const RADIUS_OPTIONS = [
  { value: "default", label: "Style default" },
  { value: "none", label: "None" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
] as const satisfies readonly CreatePickerOption[];

const MENU_COLOR_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "inverted", label: "Inverted" },
] as const satisfies readonly CreatePickerOption[];

const MENU_ACCENT_OPTIONS = [
  { value: "subtle", label: "Subtle" },
  { value: "bold", label: "Bold" },
] as const satisfies readonly CreatePickerOption[];

const TEMPLATE_OPTIONS = [
  { value: "astro", label: "Astro" },
  { value: "astro-monorepo", label: "Astro Monorepo" },
  {
    value: "astro-with-component-docs-monorepo",
    label: "Docs Monorepo",
  },
] as const satisfies readonly CreatePickerOption[];

export const CREATE_PICKER_LABELS: Record<CreatePickerName, string> = {
  style: "Style",
  baseColor: "Base Color",
  theme: "Theme",
  iconLibrary: "Icon Library",
  font: "Font",
  radius: "Radius",
  menuColor: "Menu Color",
  menuAccent: "Menu Accent",
  template: "Template",
};

export const CREATE_PICKER_MARKERS: Record<
  CreatePickerName,
  CreatePickerMarkerKind
> = {
  style: "style",
  baseColor: "swatch",
  theme: "swatch",
  iconLibrary: "icon-library",
  font: "font",
  radius: "radius",
  menuColor: "menu-color",
  menuAccent: "menu-accent",
  template: "template",
};

function getThemeColor(theme: (typeof catalogs.themes)[number]) {
  const lightVars = (theme.cssVars?.light ?? {}) as Record<string, string>;
  return lightVars.primary ?? lightVars.ring ?? "oklch(0.72 0 0)";
}

export function getCreatePickerOptions(
  config: Pick<DesignSystemConfig, "baseColor" | "style">,
) {
  const effectiveRadius = resolveEffectiveRadius(config.style, "default");

  return {
    style: STYLES.map((style) => ({
      value: style.name,
      label: style.title,
      description: style.description,
      group: style.name === "juno" ? "bejamas" : "shadcn",
    })),
    baseColor: catalogs.baseColors.map((baseColor) => ({
      value: baseColor.name,
      label: baseColor.title ?? baseColor.name,
      color: getThemeColor(baseColor),
    })),
    theme: getThemesForBaseColor(config.baseColor).map((theme) => ({
      value: theme.name,
      label: theme.title ?? theme.name,
      color: getThemeColor(theme),
    })),
    iconLibrary: catalogs.iconLibraries.map((iconLibrary) => ({
      value: iconLibrary.name,
      label: iconLibrary.label,
    })),
    font: catalogs.fonts.map((font) => ({
      value: font.name.replace("font-", ""),
      label: font.title,
      family: font.font.family,
    })),
    radius: RADIUS_OPTIONS.map((option) =>
      option.value === "default"
        ? {
            ...option,
            markerValue: effectiveRadius,
          }
        : option,
    ),
    menuColor: [...MENU_COLOR_OPTIONS],
    menuAccent: [...MENU_ACCENT_OPTIONS],
    template: TEMPLATE_VALUES.map((template) => {
      const option = TEMPLATE_OPTIONS.find((item) => item.value === template);
      return {
        value: template,
        label: option?.label ?? template,
      };
    }),
  } satisfies Record<CreatePickerName, CreatePickerOption[]>;
}

export function getCreatePickerOptionsByName(
  name: CreatePickerName,
  config: Pick<DesignSystemConfig, "baseColor" | "style">,
) {
  return getCreatePickerOptions(config)[name];
}

export function getCreatePickerOption(
  name: CreatePickerName,
  value: string,
  config: Pick<DesignSystemConfig, "baseColor" | "style">,
) {
  return getCreatePickerOptionsByName(name, config).find(
    (option) => option.value === value,
  );
}

export function getCreatePickerSelectedOption(
  name: CreatePickerName,
  config: Pick<DesignSystemConfig, "baseColor" | "style" | "radius"> &
    Partial<DesignSystemConfig>,
) {
  if (name === "radius" && config.radius === "default") {
    const effectiveRadius = resolveEffectiveRadius(config.style, config.radius);
    const effectiveOption =
      RADIUS_OPTIONS.find((option) => option.value === effectiveRadius) ??
      RADIUS_OPTIONS[0];

    return {
      value: "default",
      label: effectiveOption.label,
      markerValue: effectiveRadius,
    } satisfies CreatePickerOption;
  }

  const value = config[name];
  if (!value) {
    return undefined;
  }

  return getCreatePickerOption(name, value, config);
}

function chooseRandom<T>(values: readonly T[]) {
  return values[Math.floor(Math.random() * values.length)];
}

export function createRandomDesignSystemConfig(
  current: Pick<DesignSystemConfig, "template" | "rtl"> = DEFAULT_DESIGN_SYSTEM_CONFIG,
): DesignSystemConfig {
  const baseColor = chooseRandom(catalogs.baseColors)?.name ?? "neutral";
  const theme =
    chooseRandom(getThemesForBaseColor(baseColor))?.name ?? baseColor;

  return {
    style:
      chooseRandom(STYLES.map((style) => style.name)) ??
      DEFAULT_DESIGN_SYSTEM_CONFIG.style,
    baseColor,
    theme,
    iconLibrary:
      chooseRandom(catalogs.iconLibraries.map((item) => item.name)) ??
      DEFAULT_DESIGN_SYSTEM_CONFIG.iconLibrary,
    font:
      chooseRandom(catalogs.fonts.map((font) => font.name.replace("font-", ""))) ??
      DEFAULT_DESIGN_SYSTEM_CONFIG.font,
    radius:
      chooseRandom(RADIUS_OPTIONS.map((option) => option.value)) ??
      DEFAULT_DESIGN_SYSTEM_CONFIG.radius,
    menuColor:
      chooseRandom(MENU_COLOR_OPTIONS.map((option) => option.value)) ??
      DEFAULT_DESIGN_SYSTEM_CONFIG.menuColor,
    menuAccent:
      chooseRandom(MENU_ACCENT_OPTIONS.map((option) => option.value)) ??
      DEFAULT_DESIGN_SYSTEM_CONFIG.menuAccent,
    template: current.template,
    rtl: current.rtl,
  };
}
