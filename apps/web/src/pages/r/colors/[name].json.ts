import { BASE_COLORS } from "@bejamas/create-config/browser";
import { jsonResponse } from "@/utils/create-registry";

export function getStaticPaths() {
  return BASE_COLORS.map((color) => ({
    params: { name: color.name },
  }));
}

export async function GET({ params }: { params: { name: string } }) {
  const color = BASE_COLORS.find((entry) => entry.name === params.name);

  if (!color) {
    return jsonResponse({ error: "Base color not found." }, { status: 404 });
  }

  return jsonResponse(color);
}
