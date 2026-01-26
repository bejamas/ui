import type { APIRoute } from "astro";
import { nanoid } from "nanoid";
import { saveSharedTheme, themeExists, type SharedTheme } from "../../../lib/redis";

export const prerender = false;

// Generate a unique short ID, checking for collisions
async function generateUniqueId(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const id = nanoid(8);
    const exists = await themeExists(id);
    if (!exists) return id;
    attempts++;
  }

  // Fallback to longer ID if collisions keep happening
  return nanoid(12);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, styles, id, createdAt, shareId: existingShareId } = body as {
      name?: string;
      styles?: {
        light: Record<string, string>;
        dark: Record<string, string>;
      };
      id?: string;
      createdAt?: string;
      shareId?: string; // Existing share ID to reuse
    };

    // Validate required fields
    if (!name || typeof name !== "string") {
      return new Response(JSON.stringify({ error: "Theme name is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!styles || !styles.light || !styles.dark) {
      return new Response(
        JSON.stringify({ error: "Theme styles (light and dark) are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Reuse existing share ID if provided, otherwise generate a new one
    const shortId = existingShareId || await generateUniqueId();

    // Prepare theme data
    const themeData: Omit<SharedTheme, "sharedAt" | "views"> = {
      id: id || `shared-${shortId}`,
      name,
      styles,
      createdAt: createdAt || new Date().toISOString(),
    };

    // Save to Redis (updates if exists, creates if new)
    const savedId = await saveSharedTheme(themeData, shortId);

    if (!savedId) {
      return new Response(
        JSON.stringify({
          error: "Failed to save theme. Redis may not be configured.",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return the shareable URL
    const shareUrl = `/t/${savedId}`;

    return new Response(
      JSON.stringify({
        success: true,
        shortId: savedId,
        shareUrl,
        fullUrl: `https://ui.bejamas.com${shareUrl}`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Theme share error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to share theme";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
