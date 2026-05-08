const STYLE_REGISTRY_ALIASES = {
  "new-york-v4": "bejamas-juno",
} as const;

export const LEGACY_STYLE_REGISTRY_IDS = Object.keys(STYLE_REGISTRY_ALIASES);

export function resolveStyleRegistryId(styleId: string): string {
  return (
    STYLE_REGISTRY_ALIASES[styleId as keyof typeof STYLE_REGISTRY_ALIASES] ??
    styleId
  );
}

export function rewriteLegacyStyleRegistryUrl(url: URL): URL | null {
  const match = url.pathname.match(/^\/r\/styles\/([^/]+)\/([^/]+\.json)$/);
  if (!match) {
    return null;
  }

  const [, styleId, filename] = match;
  const resolvedStyleId = resolveStyleRegistryId(styleId);
  if (resolvedStyleId === styleId) {
    return null;
  }

  const rewrittenUrl = new URL(url);
  rewrittenUrl.pathname = `/r/styles/${resolvedStyleId}/${filename}`;
  return rewrittenUrl;
}
