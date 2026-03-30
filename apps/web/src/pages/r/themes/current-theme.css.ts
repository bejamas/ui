import type { AstroCookies } from "astro";
import {
  DEFAULT_DESIGN_SYSTEM_CONFIG,
  decodePreset,
  getCompiledGlobalStyleCss,
  isPresetCode,
  type PresetConfig,
} from "@bejamas/create-config/server";
import { buildDesignSystemThemeCss } from "../../../utils/themes/design-system-adapter";
import { applyThemeToCss } from "../../../utils/themes/apply-theme";
import { defaultPresets } from "../../../utils/themes/presets";
import {
  parseThemeCookie,
  PRESET_COOKIE_NAME,
  THEME_REF_COOKIE_NAME,
} from "../../../utils/themes/theme-cookie";
import { getThemeOverridesByRef } from "../../../utils/themes/create-theme.server";
import { SHORT_SHARED_CACHE_CONTROL } from "../../../utils/http-cache";

export const prerender = false;

export async function GET({ cookies }: { cookies: AstroCookies }) {
  try {
    const cookieValue = cookies.get(PRESET_COOKIE_NAME)?.value;
    const themeId = cookieValue ? parseThemeCookie(cookieValue).id : null;
    const themeRef = cookies.get(THEME_REF_COOKIE_NAME)?.value ?? null;
    const generated = await resolveThemeCss(themeId, themeRef);

    return new Response(
      `/* current theme */\n${generated}`,
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": SHORT_SHARED_CACHE_CONTROL,
          "Content-Type": "text/css",
          Vary: "Cookie",
        },
      },
    );
  } catch (e) {
    console.error("Error fetching the theme registry item:", e);
    return new Response("Failed to fetch the theme registry item.", {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function resolveThemeCss(
  themeId: string | null,
  themeRef: string | null,
) {
  if (themeId && isPresetCode(themeId)) {
    const decoded = decodePreset(themeId);
    if (decoded) {
      const themeOverrides = await getThemeOverridesByRef(themeRef);
      return [
        buildDesignSystemThemeCss(
          toDesignSystemConfig(decoded),
          themeOverrides,
        ),
        await getCompiledGlobalStyleCss(decoded.style),
      ].join("\n\n");
    }
  }

  const fallbackPreset =
    (themeId && defaultPresets[themeId]) || defaultPresets["default"];

  return [
    applyThemeToCss({
      currentMode: "light",
      styles: fallbackPreset.styles,
    }),
    await getCompiledGlobalStyleCss(DEFAULT_DESIGN_SYSTEM_CONFIG.style),
  ].join("\n\n");
}

function toDesignSystemConfig(preset: PresetConfig) {
  return {
    ...preset,
    template: "astro" as const,
    rtl: false,
    rtlLanguage: "ar" as const,
  };
}
