import { resolveRegistryUrl } from "./ui-base-url";

export const SHADCNBLOCKS_NAMESPACE = "@shadcnblocks/";

/** Bejamas serves Astro ports under this namespace, including for legacy configs. */
export function resolveShadcnblocksItemUrl(
  specifier: string,
  registryUrl = resolveRegistryUrl(),
  style = "bejamas-juno",
): string | null {
  if (!specifier.startsWith(SHADCNBLOCKS_NAMESPACE)) return null;
  const name = specifier.slice(SHADCNBLOCKS_NAMESPACE.length);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    throw new Error(`Invalid Shadcnblocks item name: ${specifier}`);
  }
  return `${registryUrl}/shadcnblocks/styles/${style}/${name}.json`;
}
