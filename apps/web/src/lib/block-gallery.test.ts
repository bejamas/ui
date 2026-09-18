import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import {
  blockGalleryItems,
  getBlockGalleryItem,
  getBlockInstallCommand,
  selectPublishedBlockSourceFiles,
} from "./block-gallery";

const webRoot = path.resolve(import.meta.dir, "../..");

describe("block gallery catalog", () => {
  test("maps every published block to a preview route that renders the registry block", () => {
    const registry = JSON.parse(
      fs.readFileSync(path.join(webRoot, "registry.json"), "utf8"),
    ) as { items: Array<{ name: string; type: string }> };
    const publishedBlockIds = registry.items
      .filter((item) => item.type === "registry:block")
      .map((item) => item.name)
      .sort();

    expect(blockGalleryItems.map((item) => item.id).sort()).toEqual(
      publishedBlockIds,
    );
    expect(getBlockGalleryItem("unknown-block")).toBeUndefined();

    for (const item of blockGalleryItems) {
      const routeBase = path.join(webRoot, `src/pages${item.href}`);
      const routeFile = fs.existsSync(`${routeBase}.astro`)
        ? `${routeBase}.astro`
        : path.join(routeBase, "index.astro");
      const routeSource = fs.readFileSync(routeFile, "utf8");

      expect(routeSource).toContain(`@bejamas/registry/blocks/${item.id}`);
      expect(routeSource).toContain("<BlockExampleLayout");
    }
  });

  test("builds the install command shown next to each preview", () => {
    expect(getBlockInstallCommand("features-01")).toBe(
      "bunx bejamas@latest add features-01",
    );
  });

  test("selects installable registry source with project-style import paths", () => {
    const files = selectPublishedBlockSourceFiles(
      {
        "../../public/r/features-01.json": {
          name: "features-01",
          files: [
            {
              path: "blocks/features-01/Features01.astro",
              target: "src/components/blocks/features-01/Features01.astro",
              content:
                'import { Button } from "@/registry/bejamas/ui/button";\n<section>Features</section>',
            },
            {
              path: "blocks/features-01/index.ts",
              target: "src/components/blocks/features-01/index.ts",
              content:
                'export { default as Features01 } from "./Features01.astro";',
            },
          ],
        },
        "../../public/r/footer-01.json": {
          name: "footer-01",
          files: [],
        },
      },
      "features-01",
    );

    expect(files.map((file) => file.displayName)).toEqual([
      "src/components/blocks/features-01/index.ts",
      "src/components/blocks/features-01/Features01.astro",
    ]);
    expect(files[1]?.code).toContain('from "@/ui/button"');
    expect(files[1]?.code).not.toContain("@/registry/");
  });

  test("returns no files for unknown or mismatched artifacts", () => {
    expect(
      selectPublishedBlockSourceFiles(
        { "../../public/r/features-01.json": { name: "other", files: [] } },
        "features-01",
      ),
    ).toEqual([]);
    expect(selectPublishedBlockSourceFiles({}, "features-01")).toEqual([]);
  });
});
