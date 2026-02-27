import { getEntry } from "astro:content";
import { generateThemeRegistryItemFromStyles } from "../../../utils/registry/themes";
import { registryItemSchema } from "shadcn/schema";
import { getSharedTheme, getCustomTheme } from "../../../lib/redis";

// Disable prerendering to support dynamic shared themes from Redis
export const prerender = false;

/**
 * Slugify a theme name for URL-friendly format
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Extract the short ID from a slug like "neon-azure-startup-abc123" or "headfirst-aurora-bkS-h32n"
 * Short IDs are typically short (under 15 chars) and appended at the end after the theme name slug.
 * Short IDs often contain uppercase letters (like "bkS") which distinguishes them from lowercase theme names.
 * We extract segments from the end, prioritizing candidates that contain uppercase letters.
 */
function extractShortId(slug: string): string | null {
  const segments = slug.split("-");
  // First, look for candidates with uppercase letters (strong indicator of short ID)
  // Try up to 2 segments from the end
  for (let count = 1; count <= 2 && count <= segments.length; count++) {
    const candidate = segments.slice(-count).join("-");
    if (
      /[A-Z]/.test(candidate) &&
      candidate.length >= 4 &&
      candidate.length <= 15
    ) {
      return candidate;
    }
  }

  // Fallback: if no uppercase found, try the last segment(s) that are reasonably short
  // Try up to 2 segments from the end
  for (let count = 1; count <= 2 && count <= segments.length; count++) {
    const candidate = segments.slice(-count).join("-");
    if (candidate.length >= 6 && candidate.length <= 15) {
      return candidate;
    }
  }
  return null;
}

export async function GET({ params }: { params: { slug: string } }) {
  const { slug } = params;

  try {
    // First, try to find a static theme from content collection
    const entry = await getEntry("themes", slug);
    if (entry) {
      const generated = generateThemeRegistryItemFromStyles(
        slug,
        entry.data.styles as any,
      );

      const parsed = registryItemSchema.safeParse(generated);
      if (!parsed.success) {
        console.error(
          "Could not parse the registry item from the data:",
          parsed.error.format(),
        );
        return new Response("Unexpected registry item format.", {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(parsed.data), {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600, s-maxage=86400",
        },
      });
    }

    // Not a static theme - try to extract short ID and fetch from Redis
    const shortId = extractShortId(slug);
    console.log({ slug, shortId });
    if (!shortId) {
      return new Response(JSON.stringify({ error: "Theme not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Try shared theme first
    let theme = await getSharedTheme(shortId);
    let themeSource: "shared" | "custom" = "shared";

    // If not found as shared, try as custom theme (full ID)
    if (!theme) {
      const customTheme = await getCustomTheme(`custom-${shortId}`);
      if (customTheme) {
        theme = {
          id: customTheme.id,
          name: customTheme.name,
          styles: customTheme.styles,
          createdAt: customTheme.createdAt,
          sharedAt: customTheme.modifiedAt,
        };
        themeSource = "custom";
      }
    }

    if (!theme) {
      return new Response(JSON.stringify({ error: "Theme not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate registry item from theme styles
    const registryName = slugify(theme.name);
    const generated = generateThemeRegistryItemFromStyles(
      registryName,
      theme.styles as any,
    );

    const parsed = registryItemSchema.safeParse(generated);
    if (!parsed.success) {
      console.error(
        "Could not parse the registry item from shared theme:",
        parsed.error.format(),
      );
      return new Response("Unexpected registry item format.", {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed.data), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        // Shorter cache for dynamic themes
        "Cache-Control": "public, max-age=300, s-maxage=3600",
      },
    });
  } catch (e) {
    console.error("Error fetching the theme registry item:", e);
    return new Response(
      JSON.stringify({ error: "Failed to fetch the theme registry item." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
