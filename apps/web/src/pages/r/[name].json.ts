import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  buildFontRegistryItem,
  buildUtilsRegistryItem,
  catalogs,
} from "@bejamas/create-config/server";
import { jsonResponse, readStaticRegistryItem } from "@/utils/create-registry";
import { STATIC_ASSET_CACHE_CONTROL } from "@/utils/http-cache";

export const prerender = true;

const staticRegistryRoot = path.resolve(process.cwd(), "public/r");

export async function getStaticPaths() {
  const filenames = await readdir(staticRegistryRoot);
  const fileNames = filenames
    .filter((filename) => filename.endsWith(".json"))
    .map((filename) => filename.slice(0, -".json".length));
  const fontNames = [
    ...catalogs.fonts.map((font) => font.name),
    ...catalogs.headingFonts.map((font) => font.name),
  ];

  return Array.from(new Set([...fileNames, ...fontNames, "utils"])).map(
    (name) => ({
      params: { name },
    }),
  );
}

export async function GET({ params }: { params: { name: string } }) {
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
