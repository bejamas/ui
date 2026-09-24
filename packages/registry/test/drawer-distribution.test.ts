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

describe("drawer distribution", () => {
  test("every style publishes the primitive-backed drawer and its compound parts", () => {
    for (const style of STYLES) {
      const item = readItem(`apps/web/public/r/styles/${style.id}/drawer.json`);
      const files = new Map(
        item.files.map((file) => [file.path, file.content]),
      );

      expect(item.dependencies).toContain("@data-slot/drawer");
      expect(files.get("ui/drawer/Drawer.astro")).toContain(
        'from "@data-slot/drawer"',
      );
      expect(files.get("ui/drawer/DrawerContent.astro")).toContain(
        'data-slot="drawer-popup"',
      );
      expect(files.get("ui/drawer/DrawerContent.astro")).toContain(
        'data-slot="drawer-backdrop"',
      );
      expect(files.get("ui/drawer/index.ts")).toContain("DrawerBody");
      expect(files.get("ui/drawer/index.ts")).toContain("DrawerFooter");
    }
  });

  test("the default install registry includes the runtime dependency", () => {
    const item = readItem("apps/web/public/r/drawer.json");

    expect(item.dependencies).toContain("@data-slot/drawer");
    expect(item.files.every((file) => file.path.startsWith("ui/drawer/"))).toBe(
      true,
    );
  });
});
