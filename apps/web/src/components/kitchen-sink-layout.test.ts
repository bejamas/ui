import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const layoutFile = path.resolve(import.meta.dir, "./KitchenSinkLayout.astro");

describe("kitchen sink layout", () => {
  test("supports create embed mode with client-side preview bootstrap on static pages", () => {
    const source = fs.readFileSync(layoutFile, "utf8");

    expect(source).not.toContain('Astro.url.searchParams.get("embed") === "create"');
    expect(source).toContain('id="create-theme-css"');
    expect(source).toContain('id="create-style-css"');
    expect(source).toContain('"__BEJAMAS_CREATE_PREVIEW__"');
    expect(source).toContain('document.documentElement.dataset.createEmbed = "true"');
    expect(source).toContain('body.dataset.controller = [body.dataset.controller, "create-preview"]');
    expect(source).toContain('import("@/stimulus/create")');
  });
});
