import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import {
  blockGalleryItems,
  getBlockGalleryItem,
  getBlockInstallCommand,
  loadPublishedBlockSourceFiles,
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
    expect(getBlockGalleryItem("footer-01")?.href).toBe(
      "/blocks/footers/footer-1",
    );

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
        name: "features-01",
        type: "registry:block",
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
    const files = [{ path: "blocks/a/A.astro", content: "" }];
    expect(
      selectPublishedBlockSourceFiles(
        { name: "other", type: "registry:block", files },
        "features-01",
      ),
    ).toEqual([]);
    expect(
      selectPublishedBlockSourceFiles(
        { name: "button", type: "registry:ui", files },
        "button",
      ),
    ).toEqual([]);
    expect(selectPublishedBlockSourceFiles(undefined, "features-01")).toEqual(
      [],
    );
  });

  test("loads only the requested block, whatever its name", async () => {
    const loaded: string[] = [];
    const loader = (payload: unknown) => async () => {
      loaded.push((payload as { name: string }).name);
      return payload;
    };
    const hero = {
      name: "hero",
      type: "registry:block",
      files: [
        {
          path: "blocks/hero/Hero.astro",
          target: "src/components/blocks/hero/Hero.astro",
          content: "<section />",
        },
      ],
    };
    const loaders = {
      "../../public/r/button.json": loader({ name: "button" }),
      "../../public/r/hero.json": loader(hero),
      "../../public/r/features-01.json": loader({ name: "features-01" }),
    };

    const files = await loadPublishedBlockSourceFiles(loaders, "hero");
    expect(files.map((file) => file.displayName)).toEqual([
      "src/components/blocks/hero/Hero.astro",
    ]);
    expect(loaded).toEqual(["hero"]);
  });

  test("fails loudly when a block has no published source", async () => {
    await expect(loadPublishedBlockSourceFiles({}, "hero")).rejects.toThrow(
      'No published registry source for block "hero"',
    );
  });

  test("finds published source for every catalog block", async () => {
    const loaders = Object.fromEntries(
      fs
        .readdirSync(path.join(webRoot, "public/r"))
        .filter((file) => file.endsWith(".json"))
        .map((file) => [
          `../../public/r/${file}`,
          async () =>
            JSON.parse(
              fs.readFileSync(path.join(webRoot, "public/r", file), "utf8"),
            ),
        ]),
    );
    for (const item of blockGalleryItems) {
      const files = await loadPublishedBlockSourceFiles(loaders, item.id);
      expect(files.length).toBeGreaterThan(0);
    }
  });
});
