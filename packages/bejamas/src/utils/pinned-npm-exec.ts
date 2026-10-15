import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

export interface PinnedInvocation {
  cmd: string;
  args: string[];
  source: "isolated";
}

/**
 * Run a package's bin at an exact version through `npm exec`, in a prefix of
 * its own so the user's project dependencies never interfere.
 */
export function definePinnedPackage({
  name,
  version,
  bin,
  prefixDir,
}: {
  name: string;
  version: string;
  bin: string;
  /** Directory under the OS temp dir that holds one prefix per version. */
  prefixDir: string;
}) {
  const execPrefix = path.join(os.tmpdir(), prefixDir, version);
  const spec = `${name}@${version}`;
  return {
    version,
    spec,
    execPrefix,
    async ensureExecPrefix() {
      await fs.mkdir(execPrefix, { recursive: true });
      return execPrefix;
    },
    invocation(args: string[]): PinnedInvocation {
      return {
        cmd: process.platform === "win32" ? "npm.cmd" : "npm",
        args: [
          "exec",
          "--yes",
          "--prefix",
          execPrefix,
          `--package=${spec}`,
          "--",
          bin,
          ...args,
        ],
        source: "isolated",
      };
    },
  };
}
