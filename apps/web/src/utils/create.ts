import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  decodePreset,
  designSystemConfigSchema,
  isPresetCode,
  type DesignSystemConfig,
} from "@bejamas/create-config/browser";
import { getThemeRefFromSearchParams } from "./themes/create-theme";

interface ParseCreateSearchParamsOptions {
  fallbackPreset?: string | null;
}

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

export function parseCreateSearchParams(
  searchParams: URLSearchParams,
  options: ParseCreateSearchParamsOptions = {},
) {
  let input: Partial<DesignSystemConfig> = {};
  const preset = searchParams.get("preset");

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
      template: (searchParams.get("template") ?? undefined) as
        | DesignSystemConfig["template"]
        | undefined,
      rtl: searchParams.get("rtl") === "true",
    });
  } else if (options.fallbackPreset && isPresetCode(options.fallbackPreset)) {
    const decoded = decodePreset(options.fallbackPreset);
    if (decoded) {
      input = omitUndefined({
        ...decoded,
        template: (searchParams.get("template") ?? undefined) as
          | DesignSystemConfig["template"]
          | undefined,
        rtl: searchParams.get("rtl") === "true",
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
      template: (searchParams.get("template") ?? undefined) as
        | DesignSystemConfig["template"]
        | undefined,
      rtl: searchParams.get("rtl") === "true",
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
    data: result.data,
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
