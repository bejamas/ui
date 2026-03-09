import { buildRegistryBaseItem } from "@bejamas/create-config/server";
import {
  parseCreateSearchParams,
  resolveCreateThemeRef,
} from "@/utils/create";
import { jsonResponse } from "@/utils/create-registry";
import { buildDesignSystemThemeCssVars } from "@/utils/themes/design-system-adapter";
import { getThemeOverridesByRef } from "@/utils/themes/create-theme.server";

export const prerender = false;

export async function GET({ url }: { url: URL }) {
  const result = parseCreateSearchParams(url.searchParams);

  if (!result.success) {
    return jsonResponse({ error: result.error }, { status: 400 });
  }

  const themeRef = resolveCreateThemeRef(url.searchParams);
  const themeOverrides = await getThemeOverridesByRef(themeRef);
  const item = buildRegistryBaseItem(result.data);

  if (themeOverrides) {
    item.cssVars = buildDesignSystemThemeCssVars(result.data, themeOverrides);
  }

  return jsonResponse(item);
}
