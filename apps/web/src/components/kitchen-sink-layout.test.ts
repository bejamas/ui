import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const layoutFile = path.resolve(import.meta.dir, "./KitchenSinkLayout.astro");

describe("kitchen sink layout", () => {
  test("supports create embed mode with inline theme/style CSS and the preview runtime", () => {
    const source = fs.readFileSync(layoutFile, "utf8");

    expect(source).toContain(
      'Astro.url.searchParams.get("embed") === "create"',
    );
    expect(source).toContain('id="create-theme-css"');
    expect(source).toContain('id="create-style-css"');
    expect(source).toContain(
      'buildWindowAssignmentInlineScript("__BEJAMAS_CREATE_PREVIEW__"',
    );
    expect(source).toContain('import "@/scripts/create-preview.ts"');
  });
});
