import { STYLES } from "@bejamas/create-config/browser";
import { jsonResponse } from "@/utils/create-registry";

export const prerender = false;

export async function GET() {
  return jsonResponse(
    STYLES.map((style) => ({
      name: style.id,
      label: style.title,
    })),
  );
}
