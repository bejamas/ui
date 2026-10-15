import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const stylesRoot = path.resolve(
  import.meta.dir,
  "../../../apps/web/public/r/styles",
);
const styles = fs
  .readdirSync(stylesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

type Item = {
  name: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files?: { path: string; content?: string }[];
};

function readItems(style: string) {
  const dir = path.join(stylesRoot, style);
  return new Map(
    fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".json"))
      .map((file) => {
        const item = JSON.parse(
          fs.readFileSync(path.join(dir, file), "utf8"),
        ) as Item;
        return [item.name ?? path.basename(file, ".json"), item];
      }),
  );
}

describe("published registry dependencies", () => {
  for (const style of styles) {
    test(`${style}: every registry dependency is another published item`, () => {
      const items = readItems(style);
      const problems: string[] = [];
      for (const item of items.values()) {
        for (const dependency of item.registryDependencies ?? []) {
          // Full URLs and @namespace references resolve elsewhere.
          if (/^(https?:|@)/.test(dependency)) continue;
          if (dependency === item.name) {
            problems.push(`${item.name} depends on itself`);
          } else if (!items.has(dependency)) {
            problems.push(`${item.name} depends on missing ${dependency}`);
          }
        }
      }
      expect(problems).toEqual([]);
    });
  }

  test("select installs the controller its script imports", () => {
    for (const style of styles) {
      const items = readItems(style);
      const select = items.get("select")!;
      const controller = items.get("select-controller")!;

      expect(
        select.files?.some((file) =>
          file.content?.includes('from "@/lib/select"'),
        ),
      ).toBe(true);
      expect(select.registryDependencies).toContain("select-controller");
      expect(controller.files?.map((file) => file.path)).toEqual([
        "lib/select.ts",
      ]);
      expect(controller.dependencies).toContain("@data-slot/select");
    }
  });
});
