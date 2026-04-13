import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  buildFontRegistryItem,
  buildUtilsRegistryItem,
  STYLES,
} from "@bejamas/create-config/server";
import {
  jsonResponse,
  readStaticRegistryItem,
  readStaticStyleRegistryItem,
} from "@/utils/create-registry";
import { STATIC_ASSET_CACHE_CONTROL } from "@/utils/http-cache";

export const prerender = true;

const staticStylesRoot = path.resolve(process.cwd(), "public/r/styles");
const requestedStyleIds = Array.from(
  new Set(["new-york", "new-york-v4", ...STYLES.map((style) => style.id)]),
);

export async function getStaticPaths() {
  const paths = await Promise.all(
    STYLES.map(async (style) => {
      const filenames = await readdir(path.join(staticStylesRoot, style.id));
      const names = filenames
        .filter((filename) => filename.endsWith(".json"))
        .map((filename) => filename.slice(0, -".json".length));

      return requestedStyleIds.flatMap((requestedStyle) =>
        names.map((name) => ({
          params: {
            style: style.id,
            requestedStyle,
            name,
          },
        })),
      );
    }),
  );

  return paths.flat();
}

export async function GET({
  params,
}: {
  params: { style: string; requestedStyle: string; name: string };
}) {
  const style = STYLES.find((entry) => entry.id === params.style);
  if (!style) {
    return jsonResponse(
      { error: "Style not found." },
      {
        status: 404,
        headers: { "Cache-Control": STATIC_ASSET_CACHE_CONTROL },
      },
    );
  }

  try {
    const item = await readStaticStyleRegistryItem(style.id, params.name);
    return jsonResponse(item, {
      headers: { "Cache-Control": STATIC_ASSET_CACHE_CONTROL },
    });
  } catch {}

  if (params.name === "utils") {
    return jsonResponse(buildUtilsRegistryItem(), {
      headers: { "Cache-Control": STATIC_ASSET_CACHE_CONTROL },
    });
  }

  const fontItem = buildFontRegistryItem(params.name);
  if (fontItem) {
    return jsonResponse(fontItem, {
      headers: { "Cache-Control": STATIC_ASSET_CACHE_CONTROL },
    });
  }

  try {
    const item = await readStaticRegistryItem(params.name);
    return jsonResponse(item, {
      headers: { "Cache-Control": STATIC_ASSET_CACHE_CONTROL },
    });
  } catch {
    return jsonResponse(
      { error: "Registry item not found." },
      {
        status: 404,
        headers: { "Cache-Control": STATIC_ASSET_CACHE_CONTROL },
      },
    );
  }
}
