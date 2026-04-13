import fs from "node:fs/promises";
import path from "node:path";
import {
  buildFontRegistryItem,
  buildUtilsRegistryItem,
  STYLES,
} from "@bejamas/create-config/server";
import { jsonResponse } from "@/utils/create-registry";
import { STATIC_ASSET_CACHE_CONTROL } from "@/utils/http-cache";
import { REQUESTED_STYLE_IDS } from "@/utils/registry-style-compat";

export const prerender = true;

const staticStylesRoot = path.resolve(process.cwd(), "public/r/styles");
const staticRegistryRoot = path.resolve(process.cwd(), "public/r");
const requestedStyleIds = REQUESTED_STYLE_IDS;

export async function getStaticPaths() {
  const paths = await Promise.all(
    STYLES.map(async (style) => {
      const filenames = await fs.readdir(path.join(staticStylesRoot, style.id));
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
    const filepath = path.resolve(staticStylesRoot, style.id, `${params.name}.json`);
    const item = JSON.parse(await fs.readFile(filepath, "utf8"));
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
    const filepath = path.resolve(staticRegistryRoot, `${params.name}.json`);
    const item = JSON.parse(await fs.readFile(filepath, "utf8"));
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
