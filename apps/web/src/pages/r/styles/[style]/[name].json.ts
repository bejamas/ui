import { readdir } from "node:fs/promises";
import path from "node:path";
import { STYLES } from "@bejamas/create-config/browser";
import {
  jsonResponse,
  readStaticStyleRegistryItem,
} from "@/utils/create-registry";
import { STATIC_ASSET_CACHE_CONTROL } from "@/utils/http-cache";
import {
  resolveRegistryStyleId,
  SUPPORTED_REGISTRY_STYLE_IDS,
} from "@/utils/registry-style-compat";

export const prerender = true;

function getStaticStylesRoot() {
  return path.resolve(process.cwd(), "public/r/styles");
}

export async function getStaticPaths() {
  const paths = await Promise.all(
    SUPPORTED_REGISTRY_STYLE_IDS.map(async (styleId) => {
      const resolvedStyleId = resolveRegistryStyleId(styleId);
      const filenames = await readdir(
        path.join(getStaticStylesRoot(), resolvedStyleId),
      );

      return filenames
        .filter(
          (filename) => filename.endsWith(".json") && filename !== "index.json",
        )
        .map((filename) => ({
          params: {
            style: styleId,
            name: filename.slice(0, -".json".length),
          },
        }));
    }),
  );

  return paths.flat();
}

export async function GET({
  params,
}: {
  params: { style: string; name: string };
}) {
  const styleId = resolveRegistryStyleId(params.style);
  const style = STYLES.find((entry) => entry.id === styleId);
  if (!style) {
    return jsonResponse(
      { error: "Style not found." },
      {
        status: 404,
        headers: { "Cache-Control": STATIC_ASSET_CACHE_CONTROL },
      },
    );
  }

  if (params.name === "index") {
    return jsonResponse(
      { error: "Unsupported route." },
      {
        status: 404,
        headers: { "Cache-Control": STATIC_ASSET_CACHE_CONTROL },
      },
    );
  }

  try {
    const item = await readStaticStyleRegistryItem(styleId, params.name);
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
