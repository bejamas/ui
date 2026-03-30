import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const pageTitleFile = path.resolve(import.meta.dir, "./PageTitle.astro");

describe("page title override", () => {
  test("uses the heading font token for docs page titles and aligns title actions on the baseline", () => {
    const source = fs.readFileSync(pageTitleFile, "utf8");

    expect(source).toContain('<h1 id="_top" class="tracking-tight cn-font-heading">');
    expect(source).toContain('<div class="sl-bejamas-docs-title-main">');
    expect(source).toContain('class="sl-bejamas-docs-title-links"');
    expect(source).toContain("align-items: flex-end;");
    expect(source).not.toContain('Tooltip class="ml-4"');
    expect(source).not.toContain('Tooltip class="ml-2"');
  });
});
