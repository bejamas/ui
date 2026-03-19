import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  decodePreset,
  designSystemConfigSchema,
  getDocumentLanguage,
  isPresetCode,
  normalizeDesignSystemConfig,
  RTL_LANGUAGE_VALUES,
  type DesignSystemConfig,
} from "@bejamas/create-config/browser";
import { getThemeRefFromSearchParams } from "./themes/create-theme";
import {
  getKitchenSinkPreviewHref,
  resolveCreatePreviewItem,
} from "./kitchen-sink";

interface ParseCreateSearchParamsOptions {
  fallbackPreset?: string | null;
}

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

function getRtlLanguageValue(
  searchParams: URLSearchParams,
  rtl: boolean,
): DesignSystemConfig["rtlLanguage"] | undefined {
  if (!rtl) {
    return undefined;
  }

  const value = searchParams.get("lang");
  if (
    !value ||
    !RTL_LANGUAGE_VALUES.includes(value as DesignSystemConfig["rtlLanguage"])
  ) {
    return undefined;
  }

  return value as DesignSystemConfig["rtlLanguage"];
}

export function parseCreateSearchParams(
  searchParams: URLSearchParams,
  options: ParseCreateSearchParamsOptions = {},
) {
  let input: Partial<DesignSystemConfig> = {};
  const preset = searchParams.get("preset");
  const rtl = searchParams.get("rtl") === "true";

  if (preset) {
    if (!isPresetCode(preset)) {
      return { success: false as const, error: "Invalid preset code." };
    }

    const decoded = decodePreset(preset);
    if (!decoded) {
      return { success: false as const, error: "Invalid preset code." };
    }

    input = omitUndefined({
      ...decoded,
      rtl,
      rtlLanguage: getRtlLanguageValue(searchParams, rtl),
    });
  } else if (options.fallbackPreset && isPresetCode(options.fallbackPreset)) {
    const decoded = decodePreset(options.fallbackPreset);
    if (decoded) {
      input = omitUndefined({
        ...decoded,
        rtl,
        rtlLanguage: getRtlLanguageValue(searchParams, rtl),
      });
    }
  } else {
    input = omitUndefined({
      style: (searchParams.get("style") ?? undefined) as
        | DesignSystemConfig["style"]
        | undefined,
      baseColor: (searchParams.get("baseColor") ?? undefined) as
        | DesignSystemConfig["baseColor"]
        | undefined,
      theme: (searchParams.get("theme") ?? undefined) as
        | DesignSystemConfig["theme"]
        | undefined,
      iconLibrary: (searchParams.get("iconLibrary") ?? undefined) as
        | DesignSystemConfig["iconLibrary"]
        | undefined,
      font: (searchParams.get("font") ?? undefined) as
        | DesignSystemConfig["font"]
        | undefined,
      radius: (searchParams.get("radius") ?? undefined) as
        | DesignSystemConfig["radius"]
        | undefined,
      menuAccent: (searchParams.get("menuAccent") ?? undefined) as
        | DesignSystemConfig["menuAccent"]
        | undefined,
      menuColor: (searchParams.get("menuColor") ?? undefined) as
        | DesignSystemConfig["menuColor"]
        | undefined,
      rtl,
      rtlLanguage: getRtlLanguageValue(searchParams, rtl),
    });
  }

  const result = designSystemConfigSchema.safeParse({
    ...DEFAULT_DESIGN_SYSTEM_CONFIG,
    ...input,
  });

  if (!result.success) {
    return {
      success: false as const,
      error: result.error.issues[0]?.message ?? "Invalid configuration.",
    };
  }

  return {
    success: true as const,
    data: normalizeDesignSystemConfig(result.data),
  };
}

interface ResolveCreateThemeRefOptions {
  fallbackThemeRef?: string | null;
}

export function resolveCreateThemeRef(
  searchParams: URLSearchParams,
  options: ResolveCreateThemeRefOptions = {},
) {
  return getThemeRefFromSearchParams(searchParams, options.fallbackThemeRef);
}

export const CREATE_PREVIEW_COMMAND_VALUE = "__create-preview__";

export function resolveCreatePreviewTarget(searchParams: URLSearchParams) {
  return resolveCreatePreviewItem(searchParams.get("item"));
}

export function buildCreatePreviewUrl(
  config: DesignSystemConfig,
  preset: string,
  options: {
    previewTarget?: string | null;
    themeRef?: string | null;
  } = {},
) {
  const params = new URLSearchParams({ preset });

  if (config.rtl) {
    params.set("rtl", "true");
    params.set("lang", getDocumentLanguage(config));
  }

  if (options.themeRef) {
    params.set("themeRef", options.themeRef);
  }

  if (options.previewTarget) {
    params.set("embed", "create");
    const previewHref = getKitchenSinkPreviewHref(options.previewTarget);
    if (previewHref) {
      return `${previewHref}?${params.toString()}`;
    }
  }

  return `/create/preview?${params.toString()}`;
}
