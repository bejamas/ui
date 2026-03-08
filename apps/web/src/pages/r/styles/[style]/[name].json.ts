import { STYLES } from "@bejamas/create-config/browser";
import { jsonResponse, readStaticRegistryItem } from "@/utils/create-registry";

export const prerender = false;

export async function GET({
  params,
}: {
  params: { style: string; name: string };
}) {
  const style = STYLES.find((entry) => entry.id === params.style);
  if (!style) {
    return jsonResponse({ error: "Style not found." }, { status: 404 });
  }

  if (params.name === "index") {
    return jsonResponse({ error: "Unsupported route." }, { status: 404 });
  }

  try {
    const item = await readStaticRegistryItem(params.name);
    return jsonResponse(item);
  } catch {
    return jsonResponse({ error: "Registry item not found." }, { status: 404 });
  }
}
