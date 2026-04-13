import { STYLES } from "@bejamas/create-config/browser";

export const LEGACY_REGISTRY_STYLE_ALIASES = {
  "new-york-v4": "bejamas-juno",
} as const;

export const LEGACY_REQUESTED_STYLE_IDS = [
  "new-york",
  ...Object.keys(LEGACY_REGISTRY_STYLE_ALIASES),
];

export const SUPPORTED_REGISTRY_STYLE_IDS = Array.from(
  new Set([
    ...STYLES.map((style) => style.id),
    ...Object.keys(LEGACY_REGISTRY_STYLE_ALIASES),
  ]),
);

export const REQUESTED_STYLE_IDS = Array.from(
  new Set([...LEGACY_REQUESTED_STYLE_IDS, ...STYLES.map((style) => style.id)]),
);

const resolvedRegistryStyleIds = new Set(STYLES.map((style) => style.id));

export function resolveRegistryStyleId(style: string) {
  return LEGACY_REGISTRY_STYLE_ALIASES[
    style as keyof typeof LEGACY_REGISTRY_STYLE_ALIASES
  ] ?? style;
}

export function isSupportedRegistryStyleId(style: string) {
  return resolvedRegistryStyleIds.has(resolveRegistryStyleId(style));
}
