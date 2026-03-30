import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "../../..");
const searchFile = path.resolve(import.meta.dir, "./Search.astro");
const astroConfigFile = path.resolve(repoRoot, "astro.config.mjs");

describe("starlight search override", () => {
  test("keeps the header trigger fully opaque before the search runtime enables it", () => {
    const source = fs.readFileSync(searchFile, "utf8");

    expect(source).toContain("<Button");
    expect(source).toContain('data-open-modal');
    expect(source).toContain('aria-keyshortcuts="Control+K"');
    expect(source).toContain("disabled:opacity-100");
    expect(source).toContain("disabled");
    expect(source).toContain('customElements.define("site-search", SiteSearch)');
    expect(source).toContain('openBtn.disabled = false;');
  });

  test("astro config registers the local search override", () => {
    const source = fs.readFileSync(astroConfigFile, "utf8");

    expect(source).toContain('Search: "./src/components/starlight/Search.astro"');
  });
});
