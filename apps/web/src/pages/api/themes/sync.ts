import type { APIRoute } from "astro";
import {
  saveCustomThemeToRedis,
  deleteCustomThemeFromRedis,
  type CustomTheme,
} from "../../../lib/redis";
import { normalizeThemeOverrides } from "../../../utils/themes/create-theme";
import { NO_STORE_CACHE_CONTROL } from "../../../utils/http-cache";

export const prerender = false;

/**
 * POST /api/themes/sync
 * Syncs a custom theme to Redis for server-side CSS generation
 *
 * Body: { action: "save" | "delete", theme?: CustomTheme, id?: string }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, theme, id } = body;

    if (action === "save" && theme) {
      // Validate theme structure
      if (!theme.id || !theme.name || !theme.styles) {
        return new Response(
          JSON.stringify({ error: "Invalid theme structure" }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": NO_STORE_CACHE_CONTROL,
            },
          },
        );
      }

      // Only sync custom themes (not built-in or shared)
      if (!theme.id.startsWith("custom-")) {
        return new Response(
          JSON.stringify({ error: "Only custom themes can be synced" }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": NO_STORE_CACHE_CONTROL,
            },
          },
        );
      }

      const customTheme: CustomTheme = {
        id: theme.id,
        name: theme.name,
        styles: normalizeThemeOverrides(theme.styles),
        createdAt: theme.createdAt || new Date().toISOString(),
        modifiedAt: theme.modifiedAt || new Date().toISOString(),
      };

      const success = await saveCustomThemeToRedis(customTheme);

      if (!success) {
        return new Response(
          JSON.stringify({
            error: "Failed to sync theme (Redis not configured)",
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": NO_STORE_CACHE_CONTROL,
            },
          },
        );
      }

      return new Response(JSON.stringify({ success: true, id: theme.id }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": NO_STORE_CACHE_CONTROL,
        },
      });
    }

    if (action === "delete" && id) {
      // Only delete custom themes
      if (!id.startsWith("custom-")) {
        return new Response(
          JSON.stringify({ error: "Only custom themes can be deleted" }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": NO_STORE_CACHE_CONTROL,
            },
          },
        );
      }

      const success = await deleteCustomThemeFromRedis(id);

      if (!success) {
        return new Response(
          JSON.stringify({
            error: "Failed to delete theme (Redis not configured)",
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": NO_STORE_CACHE_CONTROL,
            },
          },
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": NO_STORE_CACHE_CONTROL,
        },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": NO_STORE_CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error("Theme sync error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": NO_STORE_CACHE_CONTROL,
      },
    });
  }
};
