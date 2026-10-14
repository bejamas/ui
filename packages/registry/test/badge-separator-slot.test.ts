import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) =>
  fs.readFileSync(path.resolve(import.meta.dir, "../src/ui", file), "utf8");

describe("badge and separator data-slot", () => {
  test("badge marks its root with data-slot", () => {
    expect(read("badge/Badge.astro")).toContain('data-slot="badge"');
  });

  test("separator defaults its data-slot without duplicating a wrapper's slot", () => {
    const source = read("separator/Separator.astro");

    // A static <div> would emit both the literal attribute and the spread one,
    // and browsers keep the first, hiding ButtonGroupSeparator/ItemSeparator slots.
    expect(source).toContain('"data-slot": dataSlot = "separator"');
    expect(source).toContain("data-slot={dataSlot}");
    expect(source).not.toContain('data-slot="separator"');
  });
});
