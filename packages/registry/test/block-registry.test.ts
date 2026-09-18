import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { STYLES } from "../src/catalog/styles";
import {
  buildStyleTokenMap,
  getTemplateItemNames,
  normalizeBlockRegistryPath,
  readBlockTemplateItems,
  transformRegistrySource,
} from "../scripts/build-web-style-registry";

const repoRoot = path.resolve(import.meta.dir, "..", "..", "..");

type PublishedItem = {
  name: string;
  type: string;
  title?: string;
  description?: string;
  registryDependencies?: string[];
  files: Array<{
    path: string;
    type: string;
    target?: string;
    content?: string;
  }>;
};

function read(relativePath: string) {
  return readFileSync(path.resolve(repoRoot, relativePath), "utf8");
}

function readJson<T>(relativePath: string) {
  return JSON.parse(read(relativePath)) as T;
}

const sourceRegistry = readJson<{ items: PublishedItem[] }>(
  "apps/web/registry.json",
);
const blockItems = sourceRegistry.items.filter(
  (item) => item.type === "registry:block",
);
const blockIds = blockItems.map((item) => item.name);

describe("first-party block registry", () => {
  it("declares every block with portable component targets and UI dependencies", () => {
    for (const item of blockItems) {
      expect(item.title).toBeString();
      expect(item.description).toBeString();
      expect(item.registryDependencies?.length).toBeGreaterThan(0);
      expect(item.files.length).toBeGreaterThan(0);

      for (const file of item.files) {
        expect(file.type).toBe("registry:component");
        expect(file.path).toStartWith(
          `../../packages/registry/src/blocks/${item.name}/`,
        );
        expect(file.target).toStartWith(`src/components/blocks/${item.name}/`);
        expect(normalizeBlockRegistryPath(file.path)).toStartWith(
          `blocks/${item.name}/`,
        );
      }

      for (const dependency of item.registryDependencies ?? []) {
        expect(
          sourceRegistry.items.some(
            (candidate) =>
              candidate.name === dependency && candidate.type === "registry:ui",
          ),
        ).toBe(true);
      }
    }
  });

  it("uses registry.json as the single template source for block metadata", async () => {
    const templates = await readBlockTemplateItems();
    const templateNames = await getTemplateItemNames();

    expect(Array.from(templates.keys()).sort()).toEqual([...blockIds].sort());
    for (const blockId of blockIds) {
      expect(templateNames).toContain(blockId);
      expect(
        templates
          .get(blockId)
          ?.files?.every((file) => file.path.startsWith(`blocks/${blockId}/`)),
      ).toBe(true);
    }
  });

  it("publishes blocks in the discovery index and default registry", () => {
    const defaultIndex = readJson<Array<{ name: string; type: string }>>(
      "apps/web/public/r/index.json",
    );
    expect(
      defaultIndex
        .filter((item) => item.type === "registry:block")
        .map((item) => item.name),
    ).toEqual(blockIds);

    for (const blockId of blockIds) {
      const artifact = readJson<PublishedItem>(
        `apps/web/public/r/${blockId}.json`,
      );
      const component = artifact.files.find((file) =>
        file.path.endsWith(".astro"),
      );

      expect(artifact.type).toBe("registry:block");
      expect(component?.path).toStartWith(`blocks/${blockId}/`);
      expect(component?.content).toContain("@/registry/bejamas/ui/");
      expect(component?.content).not.toContain("@bejamas/ui");
      expect(component?.content).not.toContain("@bejamas/registry");
    }
  });

  it("does not resurrect a removed block from its published artifacts", async () => {
    const id = "removed-test-block";
    const artifactPath = path.resolve(
      repoRoot,
      `apps/web/public/r/styles/bejamas-juno/${id}.json`,
    );
    writeFileSync(
      artifactPath,
      JSON.stringify({ name: id, type: "registry:block", files: [] }),
      { flag: "wx" },
    );
    try {
      const names = await getTemplateItemNames();
      expect(names).not.toContain(id);
      expect(names).toContain("button");
      for (const remaining of blockIds) expect(names).toContain(remaining);
    } finally {
      unlinkSync(artifactPath);
    }
  });

  it("normalizes block source paths independently of the published catalog", () => {
    expect(
      normalizeBlockRegistryPath(
        "../../packages/registry/src/blocks/test-block/TestBlock.astro",
      ),
    ).toBe("blocks/test-block/TestBlock.astro");
    expect(normalizeBlockRegistryPath("ui/button/Button.astro")).toBe(
      "ui/button/Button.astro",
    );
  });

  it("publishes every block for every style bundle", () => {
    for (const style of STYLES) {
      const styledBlockNames = readdirSync(
        path.resolve(repoRoot, `apps/web/public/r/styles/${style.id}`),
      )
        .filter((filename) => filename.endsWith(".json"))
        .map((filename) =>
          readJson<{ name: string; type: string }>(
            `apps/web/public/r/styles/${style.id}/${filename}`,
          ),
        )
        .filter((item) => item.type === "registry:block")
        .map((item) => item.name)
        .sort();
      expect(styledBlockNames).toEqual([...blockIds].sort());

      for (const blockId of blockIds) {
        const artifact = readJson<PublishedItem>(
          `apps/web/public/r/styles/${style.id}/${blockId}.json`,
        );

        expect(artifact.name).toBe(blockId);
        expect(artifact.type).toBe("registry:block");
        expect(artifact.registryDependencies).toContain("index");
        expect(
          artifact.files.every(
            (file) =>
              file.type === "registry:component" &&
              file.path.startsWith(`blocks/${blockId}/`) &&
              file.target?.startsWith(`src/components/blocks/${blockId}/`) &&
              typeof file.content === "string",
          ),
        ).toBe(true);
      }
    }
  });

  it("rewrites package-local UI imports for portable installation", () => {
    const transformed = transformRegistrySource(
      'import { Button } from "@bejamas/registry/ui/button";\nimport { cn } from "@bejamas/registry/lib/utils";',
      buildStyleTokenMap("juno"),
    );

    expect(transformed).toBe(
      'import { Button } from "@/registry/bejamas/ui/button";\nimport { cn } from "@/lib/utils";',
    );
  });

  it("keeps block sources free of docs-site only imports", () => {
    for (const item of blockItems) {
      for (const file of item.files) {
        const source = read(path.join("apps/web", file.path));
        expect(source).not.toContain("@bejamas/ui/");
        expect(source).not.toContain("@/components/");
        expect(source).not.toContain("ui-next");
      }
    }
  });
});
