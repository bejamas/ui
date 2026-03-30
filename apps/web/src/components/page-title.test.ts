import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const pageTitleFile = path.resolve(import.meta.dir, "./PageTitle.astro");

describe("page title override", () => {
  test("uses the heading font token for docs page titles", () => {
    const source = fs.readFileSync(pageTitleFile, "utf8");

    expect(source).toContain('<h1 id="_top" class="tracking-tight cn-font-heading">');
  });
});
