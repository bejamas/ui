import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(
  path.resolve(
    process.cwd(),
    "apps/web/src/components/theme-editor/ImportDialog.astro",
  ),
  "utf8",
);

describe("ImportDialog", () => {
  test("renders non-submitting action buttons", () => {
    expect(source).toContain(
      '<Button type="button" variant="outline" data-slot="dialog-close">',
    );
    expect(source).toContain('<Button type="button" id="import-confirm-btn">');
  });
});
