import { STYLES } from "@bejamas/create-config/browser";
import {
  jsonResponse,
  readStaticStyleRegistryIndex,
} from "@/utils/create-registry";
import { STATIC_ASSET_CACHE_CONTROL } from "@/utils/http-cache";
import {
  LEGACY_STYLE_REGISTRY_IDS,
  resolveStyleRegistryId,
} from "@/utils/style-registry-aliases";

export const prerender = true;

const styleRouteIds = [
  ...new Set([
    ...STYLES.map((style) => style.id),
    ...LEGACY_STYLE_REGISTRY_IDS,
  ]),
];

export function getStaticPaths() {
  return styleRouteIds.map((styleId) => ({
    params: { style: styleId },
  }));
}

export async function GET({ params }: { params: { style: string } }) {
  const styleId = resolveStyleRegistryId(params.style);
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
