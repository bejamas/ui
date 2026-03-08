import {
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
} from "../../../utils/themes/theme-cookie";

export const prerender = false;

export async function GET({ cookies }: { cookies: AstroCookies }) {
  try {
    const cookieValue = cookies.get(PRESET_COOKIE_NAME)?.value;
    const themeId = cookieValue ? parseThemeCookie(cookieValue).id : null;
    const generated = await resolveThemeCss(themeId);

    return new Response(
      `/* current theme */\n/* dynamically generated at ${new Date().toISOString()} */\n${generated}`,
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "private, no-store",
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

async function resolveThemeCss(themeId: string | null) {
  if (themeId && isPresetCode(themeId)) {
    const decoded = decodePreset(themeId);
    if (decoded) {
      return [
        buildDesignSystemThemeCss(toDesignSystemConfig(decoded)),
        await getCompiledGlobalStyleCss(decoded.style),
      ].join("\n\n");
    }
  }

  const fallbackPreset =
    (themeId && defaultPresets[themeId]) || defaultPresets["default"];

  return applyThemeToCss({
    currentMode: "light",
    styles: fallbackPreset.styles,
  });
}

function toDesignSystemConfig(preset: PresetConfig) {
  return {
    ...preset,
    template: "astro" as const,
    rtl: false,
  };
}
