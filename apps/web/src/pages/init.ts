import {
  buildRegistryBaseItem,
  getStyleId,
} from "@bejamas/create-config/server";
import {
  parseCreateSearchParams,
  resolveCreateThemeRef,
} from "@/utils/create";
import { jsonResponse } from "@/utils/create-registry";
import {
  NO_STORE_CACHE_CONTROL,
  SHARED_DYNAMIC_CACHE_CONTROL,
} from "@/utils/http-cache";
import { buildDesignSystemThemeCssVars } from "@/utils/themes/design-system-adapter";
import { getThemeOverridesByRef } from "@/utils/themes/create-theme.server";
import { isCustomThemeRef } from "@/utils/themes/create-theme";

export const prerender = false;

function buildAbsoluteRegistryDependencies(
  url: URL,
  style: string,
  registryDependencies: string[],
) {
  const styleId = getStyleId(style as Parameters<typeof getStyleId>[0]);

  return registryDependencies.map((name) =>
    new URL(`/r/styles/${styleId}/${name}.json`, url).toString(),
  );
}

export async function GET({ url }: { url: URL }) {
  const result = parseCreateSearchParams(url.searchParams);

  if (!result.success) {
    return jsonResponse(
      { error: result.error },
      {
        status: 400,
        headers: {
          "Cache-Control": NO_STORE_CACHE_CONTROL,
        },
      },
    );
  }

  const themeRef = resolveCreateThemeRef(url.searchParams);
  const themeOverrides = await getThemeOverridesByRef(themeRef);
  const item = buildRegistryBaseItem(result.data);

  item.registryDependencies = buildAbsoluteRegistryDependencies(
    url,
    result.data.style,
    item.registryDependencies ?? ["utils"],
  );

  if (themeOverrides) {
    item.cssVars = buildDesignSystemThemeCssVars(result.data, themeOverrides);
  }

  return jsonResponse(item, {
    headers: {
      "Cache-Control": isCustomThemeRef(themeRef)
        ? NO_STORE_CACHE_CONTROL
        : SHARED_DYNAMIC_CACHE_CONTROL,
    },
  });
}
