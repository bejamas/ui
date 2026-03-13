const DEFAULT_UI_BASE_URL = "https://ui.bejamas.com";
const DEFAULT_REGISTRY_URL = `${DEFAULT_UI_BASE_URL}/r`;

function normalizeUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

function deriveUiBaseUrlFromRegistryUrl(registryUrl: string) {
  const normalizedRegistryUrl = normalizeUrl(registryUrl);
  return normalizedRegistryUrl.endsWith("/r")
    ? normalizedRegistryUrl.slice(0, -2)
    : DEFAULT_UI_BASE_URL;
}

export function resolveUiBaseUrl(env: NodeJS.ProcessEnv = process.env) {
  if (env.BEJAMAS_UI_URL?.trim()) {
    return normalizeUrl(env.BEJAMAS_UI_URL);
  }

  if (env.REGISTRY_URL?.trim()) {
    return deriveUiBaseUrlFromRegistryUrl(env.REGISTRY_URL);
  }

  return DEFAULT_UI_BASE_URL;
}

export function resolveRegistryUrl(env: NodeJS.ProcessEnv = process.env) {
  if (env.REGISTRY_URL?.trim()) {
    return normalizeUrl(env.REGISTRY_URL);
  }

  if (env.BEJAMAS_UI_URL?.trim()) {
    return `${normalizeUrl(env.BEJAMAS_UI_URL)}/r`;
  }

  return DEFAULT_REGISTRY_URL;
}

export function buildUiUrl(
  pathname: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${resolveUiBaseUrl(env)}${normalizedPathname}`;
}

export { DEFAULT_REGISTRY_URL, DEFAULT_UI_BASE_URL };
