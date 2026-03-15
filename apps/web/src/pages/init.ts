import {
  buildRegistryBaseItem,
  getFontValue,
  getStyleId,
} from "@bejamas/create-config/server";
import {
  parseCreateSearchParams,
  resolveCreateThemeRef,
} from "@/utils/create";
import { jsonResponse } from "@/utils/create-registry";
import { buildDesignSystemThemeCssVars } from "@/utils/themes/design-system-adapter";
import { getThemeOverridesByRef } from "@/utils/themes/create-theme.server";

export const prerender = false;

function buildAbsoluteRegistryDependencies(url: URL, style: string, font?: string) {
  const styleId = getStyleId(style as Parameters<typeof getStyleId>[0]);
  const names = ["utils"];

  if (font) {
    names.push(font);
  }

  return names.map((name) => new URL(`/r/styles/${styleId}/${name}.json`, url).toString());
}

export async function GET({ url }: { url: URL }) {
  const result = parseCreateSearchParams(url.searchParams);

  if (!result.success) {
    return jsonResponse({ error: result.error }, { status: 400 });
  }

  const themeRef = resolveCreateThemeRef(url.searchParams);
  const themeOverrides = await getThemeOverridesByRef(themeRef);
  const item = buildRegistryBaseItem(result.data);
  const font = getFontValue(result.data.font);

  item.registryDependencies = buildAbsoluteRegistryDependencies(
    url,
    result.data.style,
    font?.name,
  );

  if (themeOverrides) {
    item.cssVars = buildDesignSystemThemeCssVars(result.data, themeOverrides);
  }

  return jsonResponse(item);
}
