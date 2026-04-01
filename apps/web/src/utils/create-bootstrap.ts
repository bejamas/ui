import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  encodePreset,
  type DesignSystemConfig,
} from "@bejamas/create-config/browser";
import {
  parseCreateSearchParams,
  resolveCreatePreviewTarget,
  resolveCreateThemeRef,
} from "@/utils/create";
import {
  isCustomThemeRef,
  normalizeThemeOverrides,
  type ThemeOverrides,
} from "@/utils/themes/create-theme";
import { getStoredPreset } from "@/utils/themes/preset-store";
import { THEME_REF_COOKIE_NAME } from "@/utils/themes/theme-cookie";

export type CreateBootstrapResult =
  | {
      success: true;
      config: DesignSystemConfig;
      preset: string;
      previewTarget: string | null;
      themeRef: string | null;
      themeOverrides: ThemeOverrides;
    }
  | {
      success: false;
      error: string;
      previewTarget: string | null;
    };

const themeCache = new Map<string, Promise<ThemeOverrides | null>>();

export async function resolveCreateBootstrapState(
  searchParams: URLSearchParams,
  options: { allowCookieFallback?: boolean } = {},
): Promise<CreateBootstrapResult> {
  const fallbackPreset = options.allowCookieFallback ? getStoredPreset() : null;
  const fallbackThemeRef = options.allowCookieFallback
    ? getCookie(THEME_REF_COOKIE_NAME)
    : null;
  const result = parseCreateSearchParams(searchParams, {
    fallbackPreset,
  });
  const previewTarget = resolveCreatePreviewTarget(searchParams);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      previewTarget,
    };
  }

  const config = result.data;
  const preset = result.preset ?? encodePresetFromConfig(config);
  const requestedThemeRef = resolveCreateThemeRef(searchParams, {
    fallbackThemeRef,
  });
  const themeOverrides = normalizeThemeOverrides(
    await getThemeOverridesForRef(requestedThemeRef),
  );
  const themeRef =
    requestedThemeRef && hasThemeOverrides(themeOverrides)
      ? requestedThemeRef
      : null;

  return {
    success: true,
    config,
    preset,
    previewTarget,
    themeRef,
    themeOverrides,
  };
}

export function getDefaultCreateBootstrapState() {
  const config = DEFAULT_DESIGN_SYSTEM_CONFIG;

  return {
    config,
    preset: encodePresetFromConfig(config),
  };
}

async function getThemeOverridesForRef(themeRef: string | null) {
  if (!isCustomThemeRef(themeRef)) {
    return null;
  }

  const cached = themeCache.get(themeRef);
  if (cached) {
    return cached;
  }

  const request = fetch(`/api/themes/${encodeURIComponent(themeRef)}`, {
    headers: {
      Accept: "application/json",
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }

      const theme = (await response.json()) as {
        styles?: {
          light?: Record<string, string>;
          dark?: Record<string, string>;
        };
      };

      if (!theme.styles?.light || !theme.styles?.dark) {
        return null;
      }

      return normalizeThemeOverrides(theme.styles);
    })
    .catch(() => null);

  themeCache.set(themeRef, request);
  return request;
}

function getCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie.match(
    new RegExp(`(?:^|;)\\s*${name.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&")}=([^;]+)`),
  );

  return match ? decodeURIComponent(match[1]) : null;
}

function hasThemeOverrides(overrides: ThemeOverrides) {
  return (
    Object.keys(overrides.light).length > 0 || Object.keys(overrides.dark).length > 0
  );
}

function encodePresetFromConfig(config: DesignSystemConfig) {
  return encodePreset({
    style: config.style,
    baseColor: config.baseColor,
    theme: config.theme,
    iconLibrary: config.iconLibrary,
    font: config.font,
    fontHeading: config.fontHeading,
    radius: config.radius,
    menuAccent: config.menuAccent,
    menuColor: config.menuColor,
  } as Parameters<typeof encodePreset>[0]);
}
