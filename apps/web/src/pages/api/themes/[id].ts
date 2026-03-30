import type { APIRoute } from "astro";
import { getCustomTheme, getSharedTheme } from "../../../lib/redis";
import {
  NO_STORE_CACHE_CONTROL,
  SHARED_DYNAMIC_CACHE_CONTROL,
} from "../../../utils/http-cache";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: "Theme ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    if (id.startsWith("custom-")) {
      const theme = await getCustomTheme(id);

      if (!theme) {
        return new Response(
          JSON.stringify({ error: "Theme not found or has expired" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify(theme), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": NO_STORE_CACHE_CONTROL,
        },
      });
    }

    const theme = await getSharedTheme(id);

    if (!theme) {
      return new Response(
        JSON.stringify({ error: "Theme not found or has expired" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify(theme), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": SHARED_DYNAMIC_CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error("Theme fetch error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to fetch theme";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
