import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { STYLES } from "../src/catalog/styles";

const repoRoot = path.resolve(import.meta.dir, "../../..");

type RegistryItem = {
  dependencies: string[];
  files: { path: string; content: string }[];
};

function readItem(relativePath: string): RegistryItem {
  return JSON.parse(
    readFileSync(path.resolve(repoRoot, relativePath), "utf8"),
  ) as RegistryItem;
}

describe("resizable distribution", () => {
  test("every style publishes the primitive-backed resizable and its parts", () => {
    for (const style of STYLES) {
      const item = readItem(
        `apps/web/public/r/styles/${style.id}/resizable.json`,
      );
      const files = new Map(
        item.files.map((file) => [file.path, file.content]),
      );

      expect(item.dependencies).toContain("@data-slot/resizable");
      expect(files.get("ui/resizable/Resizable.astro")).toContain(
        'from "@data-slot/resizable"',
      );
      expect(files.get("ui/resizable/ResizablePanel.astro")).toContain(
        'data-slot="resizable-panel"',
      );
      expect(files.get("ui/resizable/ResizableHandle.astro")).toContain(
        'data-slot="resizable-handle"',
      );
      // The style token must be resolved into concrete utilities.
      expect(files.get("ui/resizable/ResizableHandle.astro")).not.toContain(
        "cn-resizable-handle-icon",
      );
      expect(files.get("ui/resizable/index.ts")).toContain("ResizablePanel");
      expect(files.get("ui/resizable/index.ts")).toContain("ResizableHandle");
    }
  });

  test("the default install registry includes the runtime dependency", () => {
    const item = readItem("apps/web/public/r/resizable.json");

    expect(item.dependencies).toContain("@data-slot/resizable");
    expect(
      item.files.every((file) => file.path.startsWith("ui/resizable/")),
    ).toBe(true);
  });
});
