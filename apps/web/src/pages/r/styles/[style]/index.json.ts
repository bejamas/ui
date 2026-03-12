import { STYLES } from "@bejamas/create-config/browser";
import {
  jsonResponse,
  readStaticStyleRegistryIndex,
} from "@/utils/create-registry";

export const prerender = true;

export function getStaticPaths() {
  return STYLES.map((style) => ({
    params: { style: style.id },
  }));
}

export async function GET({ params }: { params: { style: string } }) {
  const style = STYLES.find((entry) => entry.id === params.style);

  if (!style) {
    return jsonResponse({ error: "Style not found." }, { status: 404 });
  }

  try {
    return jsonResponse(await readStaticStyleRegistryIndex(style.id));
  } catch {
    return jsonResponse(
      { error: "Registry style not found." },
      { status: 404 },
    );
  }
}
