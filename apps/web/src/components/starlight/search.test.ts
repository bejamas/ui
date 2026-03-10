import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "../../..");
const searchFile = path.resolve(import.meta.dir, "./Search.astro");
const astroConfigFile = path.resolve(repoRoot, "astro.config.mjs");

describe("starlight search override", () => {
  test("uses InputGroup for the header trigger while keeping the Starlight modal contract", () => {
    const source = fs.readFileSync(searchFile, "utf8");

    expect(source).toContain("@bejamas/ui/components/input-group");
    expect(source).toContain("<InputGroup");
    expect(source).toContain("<InputGroupTrigger");
    expect(source).toContain('data-search-trigger');
    expect(source).toContain('data-open-modal');
    expect(source).toContain('aria-keyshortcuts="Control+K"');
    expect(source).toContain('customElements.define("site-search", SiteSearch)');
    expect(source).toContain('trigger?.addEventListener("click"');
  });

  test("astro config registers the local search override", () => {
    const source = fs.readFileSync(astroConfigFile, "utf8");

    expect(source).toContain('Search: "./src/components/starlight/Search.astro"');
  });
});
