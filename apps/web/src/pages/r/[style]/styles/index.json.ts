import { STYLES } from "@bejamas/create-config/server";
import {
  jsonResponse,
  readStaticStyleRegistryStyles,
} from "@/utils/create-registry";
import { STATIC_ASSET_CACHE_CONTROL } from "@/utils/http-cache";

export const prerender = true;

export function getStaticPaths() {
  return STYLES.map((style) => ({
    params: { style: style.id },
  }));
}

export async function GET({ params }: { params: { style: string } }) {
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
    return jsonResponse(await readStaticStyleRegistryStyles(), {
      headers: { "Cache-Control": STATIC_ASSET_CACHE_CONTROL },
    });
  } catch {
    return jsonResponse(
      { error: "Registry styles not found." },
      {
        status: 404,
        headers: { "Cache-Control": STATIC_ASSET_CACHE_CONTROL },
      },
    );
  }
}
