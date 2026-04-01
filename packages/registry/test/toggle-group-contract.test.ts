import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const packageRoot = path.resolve(import.meta.dir, "..");
const repoRoot = path.resolve(packageRoot, "../..");
const toggleGroupFile = path.resolve(
  packageRoot,
  "src/ui/toggle-group/ToggleGroup.astro",
);
const toggleGroupItemFile = path.resolve(
  packageRoot,
  "src/ui/toggle-group/ToggleGroupItem.astro",
);
const toggleFile = path.resolve(packageRoot, "src/ui/toggle/Toggle.astro");
const controllerFile = path.resolve(
  packageRoot,
  "src/lib/toggle-group-controller.ts",
);
const sharedFile = path.resolve(packageRoot, "src/lib/toggle-shared.ts");
const compatDocFile = path.resolve(repoRoot, "tmp/data-slot-toggle-group-compat.md");

describe("toggle-group compatibility contract", () => {
  test("toggle-group emits the shadcn-compatible root hooks", () => {
    const source = fs.readFileSync(toggleGroupFile, "utf8");

    expect(source).toContain('data-spacing={String(spacing)}');
    expect(source).toContain('data-horizontal={orientation === "horizontal" ? "" : undefined}');
    expect(source).toContain('data-vertical={orientation === "vertical" ? "" : undefined}');
    expect(source).toContain('style={`--gap:${spacing};${style}`}');
    expect(source).toContain('import { createToggleGroup } from "@bejamas/registry/lib/toggle-group-controller"');
    expect(source).not.toContain('import { createToggleGroup } from "@data-slot/toggle-group"');
  });

  test("toggle-group item reuses shared toggle variants", () => {
    const source = fs.readFileSync(toggleGroupItemFile, "utf8");

    expect(source).toContain("@bejamas/registry/lib/toggle-shared");
    expect(source).toContain("toggleVariants({");
    expect(source).not.toContain('const toggleVariants = cva(');
    expect(source).toContain("group-data-horizontal/toggle-group:group-data-[spacing=0]/toggle-group");
  });

  test("toggle and toggle-group share the same toggle variant contract", () => {
    const toggleSource = fs.readFileSync(toggleFile, "utf8");
    const sharedSource = fs.readFileSync(sharedFile, "utf8");

    expect(toggleSource).toContain("@bejamas/registry/lib/toggle-shared");
    expect(sharedSource).toContain("cn-toggle-variant-outline");
    expect(sharedSource).toContain("cn-toggle-size-lg");
  });

  test("local controller syncs inherited group props onto items", () => {
    const source = fs.readFileSync(controllerFile, "utf8");

    expect(source).toContain("createBaseToggleGroup");
    expect(source).toContain('root.style.setProperty("--gap", String(spacing))');
    expect(source).toContain('item.dataset.variant = itemVariant');
    expect(source).toContain('item.dataset.size = itemSize');
    expect(source).toContain('item.dataset.spacing = String(spacing)');
    expect(source).toContain('item.classList.add(className)');
  });

  test("compatibility note records the Astro bridge", () => {
    const source = fs.readFileSync(compatDocFile, "utf8");

    expect(source).toContain("# @data-slot/toggle-group compatibility adjustments");
    expect(source).toContain("data-spacing");
    expect(source).toContain("data-horizontal");
    expect(source).toContain("data-vertical");
    expect(source).toContain("ToggleGroupItem");
  });
});
