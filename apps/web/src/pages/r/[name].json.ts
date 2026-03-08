import {
  buildFontRegistryItem,
  buildUtilsRegistryItem,
} from "@bejamas/create-config/server";
import { jsonResponse, readStaticRegistryItem } from "@/utils/create-registry";

export const prerender = false;

export async function GET({ params }: { params: { name: string } }) {
  if (params.name === "utils") {
    return jsonResponse(buildUtilsRegistryItem());
  }

  const fontItem = buildFontRegistryItem(params.name);
  if (fontItem) {
    return jsonResponse(fontItem);
  }

  try {
    const item = await readStaticRegistryItem(params.name);
    return jsonResponse(item);
  } catch {
    return jsonResponse({ error: "Registry item not found." }, { status: 404 });
  }
}
