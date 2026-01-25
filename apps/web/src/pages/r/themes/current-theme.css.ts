import { getEntry } from "astro:content";
import { applyThemeToCss } from "../../../utils/themes/apply-theme";
import { getSharedTheme, getCustomTheme } from "../../../lib/redis";
import { parseThemeCookie } from "../../../utils/themes/preset-store";
import { defaultPresets } from "../../../utils/themes/presets";

export const prerender = false;

const parseCookies = (request: Request) => {
  const cookies = request.headers.get("Cookie");
  if (!cookies) return {} as Record<string, string>;
  return cookies.split(";").reduce(
    (acc, cookie) => {
      const [key, value] = cookie.split("=");
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    },
    {} as Record<string, string>
  );
};

export async function GET({
  request,
}: {
  request: Request;
  params: { slug: string };
}) {
  try {
    const cookies = parseCookies(request);
    const rawThemeCookie = cookies.theme;

    // Parse the extended cookie format: id|primaryLight|accentLight|primaryDark|accentDark
    let themeId = "default";
    if (rawThemeCookie) {
      const decoded = decodeURIComponent(rawThemeCookie);
      const parsed = parseThemeCookie(decoded);
      themeId = parsed.id;
    }

    // Check if this is a shared theme from Redis
    if (themeId.startsWith("shared-")) {
      // Extract the short ID (remove "shared-" prefix)
      const shortId = themeId.replace("shared-", "");
      const sharedTheme = await getSharedTheme(shortId);

      if (sharedTheme) {
        const generated = applyThemeToCss({
          currentMode: "light", // Default mode, CSS includes both light and dark
          styles: sharedTheme.styles,
        });

        return new Response(
          `/* ${themeId} (shared) */\n/* dynamically generated at ${new Date().toISOString()} */\n${generated}`,
          {
            status: 200,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "s-maxage=300", // Shorter cache for shared themes
              Vary: "Cookie",
              "Content-Type": "text/css",
            },
          }
        );
      }
      // Fall through to default if shared theme not found
      themeId = "default";
    }

    // Check if this is a custom theme (starts with "custom-")
    // Custom themes are synced to Redis for server-side CSS generation
    if (themeId.startsWith("custom-")) {
      const customTheme = await getCustomTheme(themeId);

      if (customTheme) {
        const generated = applyThemeToCss({
          currentMode: "light",
          styles: customTheme.styles,
        });

        return new Response(
          `/* ${themeId} (custom) */\n/* dynamically generated at ${new Date().toISOString()} */\n${generated}`,
          {
            status: 200,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "s-maxage=300", // Shorter cache for custom themes
              Vary: "Cookie",
              "Content-Type": "text/css",
            },
          }
        );
      }

      // Fall back to default if custom theme not found in Redis
      // (may not have been synced yet - client-side will apply the theme)
      const defaultPreset = defaultPresets["default"];
      if (defaultPreset) {
        const generated = applyThemeToCss({
          currentMode: "light",
          styles: defaultPreset.styles,
        });

        return new Response(
          `/* ${themeId} (custom - fallback to default, not synced yet) */\n/* dynamically generated at ${new Date().toISOString()} */\n${generated}`,
          {
            status: 200,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "s-maxage=60", // Very short cache for non-synced themes
              Vary: "Cookie",
              "Content-Type": "text/css",
            },
          }
        );
      }
    }

    // Try content collection first
    const entry = await getEntry("themes", themeId);
    if (entry) {
      const generated = applyThemeToCss({
        currentMode: entry.data.mode,
        styles: entry.data.styles,
      });

      return new Response(
        `/* ${themeId} */\n/* dynamically generated at ${new Date().toISOString()} */\n${generated}`,
        {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "s-maxage=3600",
            Vary: "Cookie",
            "Content-Type": "text/css",
          },
        }
      );
    }

    // Try built-in presets
    const builtInPreset = defaultPresets[themeId as keyof typeof defaultPresets];
    if (builtInPreset) {
      const generated = applyThemeToCss({
        currentMode: "light",
        styles: builtInPreset.styles,
      });

      return new Response(
        `/* ${themeId} (built-in) */\n/* dynamically generated at ${new Date().toISOString()} */\n${generated}`,
        {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "s-maxage=3600",
            Vary: "Cookie",
            "Content-Type": "text/css",
          },
        }
      );
    }

    // Fallback to absolute default
    const fallbackPreset = defaultPresets["default"];
    const generated = applyThemeToCss({
      currentMode: "light",
      styles: fallbackPreset.styles,
    });

    return new Response(
      `/* default (fallback) */\n/* dynamically generated at ${new Date().toISOString()} */\n${generated}`,
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "s-maxage=3600",
          Vary: "Cookie",
          "Content-Type": "text/css",
        },
      }
    );
  } catch (e) {
    console.error("Error fetching the theme registry item:", e);
    return new Response("Failed to fetch the theme registry item.", {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
