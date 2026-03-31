import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  RTL_LANGUAGE_VALUES,
  STYLES,
  TEMPLATE_VALUES,
  catalogs,
  isStyleOptionLocked,
  normalizeDesignSystemConfig,
  getThemesForBaseColor,
  isTranslucentMenuColor,
  resolveEffectiveRadius,
  type DesignSystemConfig,
} from "@bejamas/create-config/browser";

export type CreatePickerName =
  | "style"
  | "baseColor"
  | "theme"
  | "iconLibrary"
  | "fontHeading"
  | "font"
  | "radius"
  | "menuColor"
  | "menuAccent"
  | "template"
  | "rtlLanguage";

export type CreateLockableParam = Exclude<
  CreatePickerName,
  "template" | "rtlLanguage"
>;

export const CREATE_LOCKABLE_PARAMS = [
  "style",
  "baseColor",
  "theme",
  "iconLibrary",
  "fontHeading",
  "font",
  "radius",
  "menuColor",
  "menuAccent",
] as const satisfies readonly CreateLockableParam[];

export function hasCreateLockableParam(
  value: string,
): value is CreateLockableParam {
  return CREATE_LOCKABLE_PARAMS.includes(value as CreateLockableParam);
}

export type CreatePickerMarkerKind =
  | "style"
  | "swatch"
  | "icon-library"
  | "font"
  | "radius"
  | "menu-color"
  | "menu-accent"
  | "template"
  | "language";

export type CreatePickerOption = {
  value: string;
  label: string;
  description?: string;
  group?: keyof typeof CREATE_PICKER_GROUP_LABELS;
  color?: string;
  family?: string;
  markerValue?: string;
  disabled?: boolean;
};

export type CreatePickerGroup = {
  group: keyof typeof CREATE_PICKER_GROUP_LABELS;
  label: (typeof CREATE_PICKER_GROUP_LABELS)[keyof typeof CREATE_PICKER_GROUP_LABELS];
  options: CreatePickerOption[];
};

export type CreateFontGroup = "sans" | "serif" | "mono";

export const CREATE_FONT_GROUPS = ["sans", "serif", "mono"] as const satisfies readonly CreateFontGroup[];

export const CREATE_PICKER_GROUP_LABELS = {
  bejamas: "Bejamas",
  shadcn: "shadcn",
  sans: "Sans Serif",
  serif: "Serif",
  mono: "Monospace",
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
  { value: "default-translucent", label: "Default Translucent" },
  { value: "inverted-translucent", label: "Inverted Translucent" },
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

const RTL_LANGUAGE_OPTIONS = [
  { value: "ar", label: "Arabic", markerValue: "ar" },
  { value: "fa", label: "Persian", markerValue: "fa" },
  { value: "he", label: "Hebrew", markerValue: "he" },
] as const satisfies readonly CreatePickerOption[];

export const CREATE_PICKER_LABELS: Record<CreatePickerName, string> = {
  style: "Style",
  baseColor: "Base Color",
  theme: "Theme",
  iconLibrary: "Icon Library",
  fontHeading: "Heading",
  font: "Font",
  radius: "Radius",
  menuColor: "Menu",
  menuAccent: "Menu Accent",
  template: "Template",
  rtlLanguage: "Language",
};

export const CREATE_PICKER_MARKERS: Record<
  CreatePickerName,
  CreatePickerMarkerKind
> = {
  style: "style",
  baseColor: "swatch",
  theme: "swatch",
  iconLibrary: "icon-library",
  fontHeading: "font",
  font: "font",
  radius: "radius",
  menuColor: "menu-color",
  menuAccent: "menu-accent",
  template: "template",
  rtlLanguage: "language",
};

function getThemeColor(theme: (typeof catalogs.themes)[number]) {
  const lightVars = (theme.cssVars?.light ?? {}) as Record<string, string>;
  return lightVars.primary ?? lightVars.ring ?? "oklch(0.72 0 0)";
}

function getFontValueFromCatalog(value: string) {
  return catalogs.fonts.find((item) => item.name.replace("font-", "") === value);
}

function getFontPickerGroup(
  font: (typeof catalogs.fonts)[number],
): "sans" | "serif" | "mono" {
  if (font.font.variable === "--font-serif") {
    return "serif";
  }

  if (font.font.variable === "--font-mono") {
    return "mono";
  }

  return "sans";
}

export function isCreateFontGroup(value: string): value is CreateFontGroup {
  return CREATE_FONT_GROUPS.includes(value as CreateFontGroup);
}

export function getFontGroupForFontValue(
  value: string,
): CreateFontGroup | null {
  const font = getFontValueFromCatalog(value);

  return font ? getFontPickerGroup(font) : null;
}

export function getFontValuesForGroup(group: CreateFontGroup) {
  return catalogs.fonts
    .filter((font) => getFontPickerGroup(font) === group)
    .map((font) => font.name.replace("font-", ""));
}

export function getCreatePickerOptions(
  config: Pick<DesignSystemConfig, "baseColor" | "style"> &
    Partial<Pick<DesignSystemConfig, "font" | "menuColor">>,
) {
  const effectiveRadius = resolveEffectiveRadius(config.style, "default");
  const currentBodyFont =
    getFontValueFromCatalog(config.font ?? DEFAULT_DESIGN_SYSTEM_CONFIG.font) ??
    catalogs.fonts[0];
  const fontOptions = catalogs.fonts
    .map((font) => ({
      value: font.name.replace("font-", ""),
      label: font.title ?? font.name.replace("font-", ""),
      family: font.font.family,
      group: getFontPickerGroup(font),
    }))
    .sort((left, right) => {
      const groupOrder = { sans: 0, serif: 1, mono: 2 } as const;
      const groupDiff =
        groupOrder[left.group as keyof typeof groupOrder] -
        groupOrder[right.group as keyof typeof groupOrder];

      return groupDiff !== 0
        ? groupDiff
        : left.label.localeCompare(right.label);
    });

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
    fontHeading: [
      {
        value: "inherit",
        label:
          currentBodyFont?.title ??
          currentBodyFont?.name.replace("font-", "") ??
          "Body font",
        family: currentBodyFont?.font.family,
      },
      ...fontOptions,
    ],
    font: fontOptions,
    radius: RADIUS_OPTIONS.map((option) =>
      option.value === "default"
        ? {
            ...option,
            markerValue: effectiveRadius,
          }
        : option,
    ),
    menuColor: [...MENU_COLOR_OPTIONS],
    menuAccent: MENU_ACCENT_OPTIONS.map((option) => ({
      ...option,
      disabled:
        option.value === "bold" &&
        isTranslucentMenuColor(
          config.menuColor ?? DEFAULT_DESIGN_SYSTEM_CONFIG.menuColor,
        ),
    })),
    template: TEMPLATE_VALUES.map((template) => {
      const option = TEMPLATE_OPTIONS.find((item) => item.value === template);
      return {
        value: template,
        label: option?.label ?? template,
      };
    }),
    rtlLanguage: RTL_LANGUAGE_VALUES.map((language) => {
      const option = RTL_LANGUAGE_OPTIONS.find(
        (item) => item.value === language,
      );
      return {
        value: language,
        label: option?.label ?? language,
        markerValue: option?.markerValue ?? language,
      };
    }),
  } satisfies Record<CreatePickerName, CreatePickerOption[]>;
}

export function getCreatePickerOptionsByName(
  name: CreatePickerName,
  config: Pick<DesignSystemConfig, "baseColor" | "style"> &
    Partial<Pick<DesignSystemConfig, "font" | "menuColor">>,
) {
  return getCreatePickerOptions(config)[name];
}

export function isCreatePickerDisabled(
  name: CreatePickerName,
  config: Pick<DesignSystemConfig, "style">,
) {
  return name === "radius" && isStyleOptionLocked(config.style, "radius");
}

export function getCreatePickerOption(
  name: CreatePickerName,
  value: string,
  config: Pick<DesignSystemConfig, "baseColor" | "style"> &
    Partial<Pick<DesignSystemConfig, "font">>,
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
  const normalizedConfig = normalizeDesignSystemConfig({
    ...DEFAULT_DESIGN_SYSTEM_CONFIG,
    ...config,
  });

  if (name === "radius" && config.radius === "default") {
    const effectiveRadius = resolveEffectiveRadius(
      normalizedConfig.style,
      normalizedConfig.radius,
    );
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

  return getCreatePickerOption(name, normalizedConfig[name], normalizedConfig);
}

function chooseRandom<T>(values: readonly T[]) {
  return values[Math.floor(Math.random() * values.length)];
}

export function createRandomDesignSystemConfig(
  current: Pick<DesignSystemConfig, "template" | "rtl"> &
    Partial<DesignSystemConfig> = DEFAULT_DESIGN_SYSTEM_CONFIG,
  options: {
    locked?: Iterable<CreateLockableParam>;
    hasCustomTheme?: boolean;
    lockedFontGroup?: CreateFontGroup | null;
  } = {},
): DesignSystemConfig {
  const locked = new Set(options.locked ?? []);
  const style = locked.has("style")
    ? current.style ?? DEFAULT_DESIGN_SYSTEM_CONFIG.style
    : (chooseRandom(STYLES.map((style) => style.name)) ??
      DEFAULT_DESIGN_SYSTEM_CONFIG.style);

  const preserveBaseColorForLockedTheme =
    locked.has("theme") &&
    (Boolean(options.hasCustomTheme) ||
      current.theme === current.baseColor ||
      current.theme === undefined);

  const baseColor =
    locked.has("baseColor") || preserveBaseColorForLockedTheme
      ? (current.baseColor ?? DEFAULT_DESIGN_SYSTEM_CONFIG.baseColor)
      : (chooseRandom(catalogs.baseColors)?.name ??
        DEFAULT_DESIGN_SYSTEM_CONFIG.baseColor);
  const themeOptions = getThemesForBaseColor(baseColor);
  const theme = locked.has("theme")
    ? (current.theme ?? themeOptions[0]?.name ?? baseColor)
    : (chooseRandom(themeOptions)?.name ?? themeOptions[0]?.name ?? baseColor);

  const menuColorOptions =
    locked.has("menuAccent") &&
    (current.menuAccent ?? DEFAULT_DESIGN_SYSTEM_CONFIG.menuAccent) === "bold"
      ? MENU_COLOR_OPTIONS.filter(
          (option) => !isTranslucentMenuColor(option.value),
        )
      : MENU_COLOR_OPTIONS;
  const menuColor = locked.has("menuColor")
    ? (current.menuColor ?? DEFAULT_DESIGN_SYSTEM_CONFIG.menuColor)
    : (chooseRandom(menuColorOptions.map((option) => option.value)) ??
      DEFAULT_DESIGN_SYSTEM_CONFIG.menuColor);
  const menuAccent = locked.has("menuAccent")
    ? (current.menuAccent ?? DEFAULT_DESIGN_SYSTEM_CONFIG.menuAccent)
    : isTranslucentMenuColor(menuColor)
      ? "subtle"
      : (chooseRandom(MENU_ACCENT_OPTIONS.map((option) => option.value)) ??
        DEFAULT_DESIGN_SYSTEM_CONFIG.menuAccent);
  const fontOptions = options.lockedFontGroup
    ? getFontValuesForGroup(options.lockedFontGroup)
    : catalogs.fonts.map((font) => font.name.replace("font-", ""));
  const font = locked.has("font")
    ? (current.font ?? DEFAULT_DESIGN_SYSTEM_CONFIG.font)
    : (chooseRandom(fontOptions) ?? DEFAULT_DESIGN_SYSTEM_CONFIG.font);
  const bodyFontGroup = getFontGroupForFontValue(font);
  const contrastingHeadingFonts = catalogs.fonts
    .map((fontOption) => fontOption.name.replace("font-", ""))
    .filter((value) => {
      if (value === font) {
        return false;
      }

      if (!bodyFontGroup) {
        return true;
      }

      return getFontGroupForFontValue(value) !== bodyFontGroup;
    });
  const fontHeading = locked.has("fontHeading")
    ? (current.fontHeading ?? DEFAULT_DESIGN_SYSTEM_CONFIG.fontHeading)
    : Math.random() < 0.7
      ? "inherit"
      : (chooseRandom(contrastingHeadingFonts) ??
        chooseRandom(catalogs.fonts.map((item) => item.name.replace("font-", ""))) ??
        DEFAULT_DESIGN_SYSTEM_CONFIG.font);

  return normalizeDesignSystemConfig({
    style,
    baseColor,
    theme,
    iconLibrary: locked.has("iconLibrary")
      ? (current.iconLibrary ?? DEFAULT_DESIGN_SYSTEM_CONFIG.iconLibrary)
      : (chooseRandom(catalogs.iconLibraries.map((item) => item.name)) ??
        DEFAULT_DESIGN_SYSTEM_CONFIG.iconLibrary),
    font,
    fontHeading,
    radius: locked.has("radius")
      ? (current.radius ?? DEFAULT_DESIGN_SYSTEM_CONFIG.radius)
      : (chooseRandom(RADIUS_OPTIONS.map((option) => option.value)) ??
        DEFAULT_DESIGN_SYSTEM_CONFIG.radius),
    menuColor,
    menuAccent,
    template: current.template ?? DEFAULT_DESIGN_SYSTEM_CONFIG.template,
    rtl: current.rtl ?? DEFAULT_DESIGN_SYSTEM_CONFIG.rtl,
    rtlLanguage:
      current.rtlLanguage ?? DEFAULT_DESIGN_SYSTEM_CONFIG.rtlLanguage,
  });
}
