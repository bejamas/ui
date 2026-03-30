export const STATIC_ASSET_CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400";
export const SHARED_DYNAMIC_CACHE_CONTROL =
  "public, max-age=0, s-maxage=300, stale-while-revalidate=3600";
export const SHORT_SHARED_CACHE_CONTROL =
  "public, max-age=0, s-maxage=60, stale-while-revalidate=300";
export const PRIVATE_NO_STORE_CACHE_CONTROL = "private, no-store";
export const NO_STORE_CACHE_CONTROL = "no-store";

export function withCacheHeaders(
  init: ResponseInit | undefined,
  headers: Record<string, string>,
): ResponseInit {
  return {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...headers,
    },
  };
}
