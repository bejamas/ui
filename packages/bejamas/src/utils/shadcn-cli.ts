import { createRequire } from "module";

const require = createRequire(import.meta.url);

export const PINNED_SHADCN_VERSION = "3.8.5";
export const PINNED_SHADCN_PACKAGE = `shadcn@${PINNED_SHADCN_VERSION}`;

export interface ShadcnInvocation {
  cmd: string;
  args: string[];
  source: "bundled" | "fallback";
}

export function resolveBundledShadcnEntrypoint() {
  try {
    return require.resolve("shadcn");
  } catch {
    return null;
  }
}

export function buildPinnedShadcnInvocation(
  shadcnArgs: string[],
  bundledEntrypoint = resolveBundledShadcnEntrypoint(),
): ShadcnInvocation {
  if (bundledEntrypoint) {
    return {
      cmd: process.execPath,
      args: [bundledEntrypoint, ...shadcnArgs],
      source: "bundled",
    };
  }

  return {
    cmd: "npx",
    args: ["-y", PINNED_SHADCN_PACKAGE, ...shadcnArgs],
    source: "fallback",
  };
}
