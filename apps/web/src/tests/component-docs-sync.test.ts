import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const appRoot = path.resolve(import.meta.dir, "../..");
const committedDocsDir = path.join(appRoot, "src/content/docs/components");

function readMdx(directory: string) {
  return new Map(
    fs
      .readdirSync(directory)
      .filter((file) => file.endsWith(".mdx"))
      .map((file) => [file, fs.readFileSync(path.join(directory, file), "utf8")]),
  );
}

describe("component docs sync", () => {
  test(
    "committed component docs match `bun run build:docs` output",
    async () => {
      const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "bejamas-docs-"));

      try {
        const build = Bun.spawn({
          cmd: ["bun", "run", "build:docs"],
          cwd: appRoot,
          env: { ...Bun.env, BEJAMAS_DOCS_OUT_DIR: outDir },
          stdout: "ignore",
          stderr: "pipe",
        });
        const exitCode = await build.exited;
        expect(exitCode, await new Response(build.stderr).text()).toBe(0);

        const generated = readMdx(outDir);
        const committed = readMdx(committedDocsDir);
        const staleFiles = [...generated]
          .filter(([file, content]) => committed.get(file) !== content)
          .map(([file]) => file);
        const unexpectedFiles = [...committed.keys()].filter(
          (file) => !generated.has(file),
        );

        // Edit the component JSDoc in packages/registry/src/ui, then run
        // `bun run build:artifacts` in apps/web. Don't edit these files by hand.
        expect(staleFiles).toEqual([]);
        expect(unexpectedFiles).toEqual([]);
      } finally {
        fs.rmSync(outDir, { recursive: true, force: true });
      }
    },
    { timeout: 60_000 },
  );
});
