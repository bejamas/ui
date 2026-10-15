import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..");

/** Files of a published bejamas-juno item, by file name. */
function registryFiles(name: string) {
  const item = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, `apps/web/public/r/styles/bejamas-juno/${name}.json`),
      "utf8",
    ),
  ) as { files: { path: string; content: string }[] };
  return new Map(
    item.files.map((file) => [path.basename(file.path), file.content]),
  );
}

// The components and utils a template ships must be what `bejamas add`
// installs, or `add --overwrite` is needed just to get the current version.
const TEMPLATES = [
  { root: "templates/astro/src", ui: "ui", utils: "@/lib/utils" },
  {
    root: "templates/monorepo-astro/packages/ui/src",
    ui: "components",
    utils: "@repo/ui/lib/utils",
  },
  {
    root: "templates/monorepo-astro-with-docs/packages/ui/src",
    ui: "components",
    utils: "@repo/ui/lib/utils",
  },
];

describe("template components match the registry", () => {
  for (const template of TEMPLATES) {
    test(template.root, () => {
      const read = (file: string) =>
        fs.readFileSync(path.join(repoRoot, template.root, file), "utf8");

      for (const [file, content] of registryFiles("button")) {
        expect(read(`${template.ui}/button/${file}`)).toBe(
          content.replace('from "@/lib/utils"', `from "${template.utils}"`),
        );
      }
      expect(read("lib/utils.ts")).toBe(
        registryFiles("utils").get("utils.ts")!,
      );
    });
  }
});
