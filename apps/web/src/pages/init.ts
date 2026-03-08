import { buildRegistryBaseItem } from "@bejamas/create-config/server";
import { parseCreateSearchParams } from "@/utils/create";
import { jsonResponse } from "@/utils/create-registry";

export const prerender = false;

export async function GET({ url }: { url: URL }) {
  const result = parseCreateSearchParams(url.searchParams);

  if (!result.success) {
    return jsonResponse({ error: result.error }, { status: 400 });
  }

  return jsonResponse(buildRegistryBaseItem(result.data));
}
