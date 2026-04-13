import { STYLES } from "@bejamas/create-config/browser";
import {
  jsonResponse,
  readStaticStyleRegistryIndex,
} from "@/utils/create-registry";
import { STATIC_ASSET_CACHE_CONTROL } from "@/utils/http-cache";
import {
  resolveRegistryStyleId,
  SUPPORTED_REGISTRY_STYLE_IDS,
} from "@/utils/registry-style-compat";

export const prerender = true;

export function getStaticPaths() {
  return SUPPORTED_REGISTRY_STYLE_IDS.map((style) => ({
    params: { style },
  }));
}

export async function GET({ params }: { params: { style: string } }) {
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

  try {
    return jsonResponse(await readStaticStyleRegistryIndex(styleId), {
      headers: { "Cache-Control": STATIC_ASSET_CACHE_CONTROL },
    });
  } catch {
    return jsonResponse(
      { error: "Registry style not found." },
      {
        status: 404,
        headers: { "Cache-Control": STATIC_ASSET_CACHE_CONTROL },
      },
    );
  }
}
