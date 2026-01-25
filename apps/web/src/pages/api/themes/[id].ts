import type { APIRoute } from "astro";
import { getSharedTheme } from "../../../lib/redis";

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
    const theme = await getSharedTheme(id);

    if (!theme) {
      return new Response(
        JSON.stringify({ error: "Theme not found or has expired" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(theme), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Cache for 5 minutes on CDN, stale-while-revalidate for 1 hour
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
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
