import { STYLES } from "@bejamas/create-config/browser";
import { buildStyleIndexItem } from "@bejamas/create-config/server";
import { jsonResponse } from "@/utils/create-registry";

export const prerender = false;

export async function GET({ params }: { params: { style: string } }) {
  const style = STYLES.find((entry) => entry.id === params.style);

  if (!style) {
    return jsonResponse({ error: "Style not found." }, { status: 404 });
  }

  return jsonResponse(buildStyleIndexItem(style.name));
}
