import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

export const PINNED_SHADCN_VERSION = "4.1.1";
export const PINNED_SHADCN_PACKAGE = `shadcn@${PINNED_SHADCN_VERSION}`;
export const PINNED_SHADCN_EXEC_PREFIX = path.join(
  os.tmpdir(),
  "bejamas-shadcn",
  PINNED_SHADCN_VERSION,
);

export interface ShadcnInvocation {
  cmd: string;
  args: string[];
  source: "isolated";
}

export async function ensurePinnedShadcnExecPrefix() {
  await fs.mkdir(PINNED_SHADCN_EXEC_PREFIX, { recursive: true });
  return PINNED_SHADCN_EXEC_PREFIX;
}

function getNpmExecutable() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

export function buildPinnedShadcnInvocation(
  shadcnArgs: string[],
): ShadcnInvocation {
  return {
    cmd: getNpmExecutable(),
    args: [
      "exec",
      "--yes",
      "--prefix",
      PINNED_SHADCN_EXEC_PREFIX,
      `--package=${PINNED_SHADCN_PACKAGE}`,
      "--",
      "shadcn",
      ...shadcnArgs,
    ],
    source: "isolated",
  };
}
