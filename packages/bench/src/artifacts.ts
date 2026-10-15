import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Writes report files under one directory and returns each file's path. */
export interface Artifacts {
  dir: string;
  write: (path: string, data: string | Uint8Array) => string;
}

/**
 * Report files are opt-in. Without a directory there is no writer, so callers
 * use `artifacts?.write(path, encode())`, which also skips the encoding.
 */
export function createArtifacts(outDir: string | undefined) {
  if (!outDir) return undefined;
  const dir = resolve(outDir);
  // Fail on an unwritable directory before minutes of measuring.
  mkdirSync(dir, { recursive: true });
  return {
    dir,
    write(path, data) {
      const file = join(dir, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, data);
      return file;
    },
  } satisfies Artifacts;
}
