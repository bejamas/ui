import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const checkboxFile = path.resolve(
  import.meta.dir,
  "../src/ui/checkbox/Checkbox.astro",
);

describe("checkbox compatibility contract", () => {
  test("defaultChecked sets the native checked attribute", () => {
    const source = fs.readFileSync(checkboxFile, "utf8");

    // Spreading defaultChecked would render an unknown `defaultchecked` attribute.
    expect(source).toContain("defaultChecked,");
    expect(source).toContain("checked={checked ?? defaultChecked}");
  });
});
