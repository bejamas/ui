import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const indexPageFile = path.resolve(import.meta.dir, "../../pages/index.astro");
const themesPageFile = path.resolve(import.meta.dir, "../../pages/themes.astro");
const blocksIndexPageFile = path.resolve(
  import.meta.dir,
  "../../pages/blocks/index.astro",
);
const blocksSlugPageFile = path.resolve(
  import.meta.dir,
  "../../pages/blocks/[slug].astro",
);
const createPageFile = path.resolve(import.meta.dir, "../../pages/create.astro");
const blogIndexPageFile = path.resolve(
  import.meta.dir,
  "../../pages/blog/index.astro",
);
const blogSlugPageFile = path.resolve(
  import.meta.dir,
  "../../pages/blog/[slug].astro",
);
const sharedThemePageFile = path.resolve(
  import.meta.dir,
  "../../pages/t/[id].astro",
);

describe("page style scoping", () => {
  test("scopes page-level Starlight overrides behind page markers", () => {
    const indexSource = fs.readFileSync(indexPageFile, "utf8");
    const themesSource = fs.readFileSync(themesPageFile, "utf8");
    const blocksIndexSource = fs.readFileSync(blocksIndexPageFile, "utf8");
    const blocksSlugSource = fs.readFileSync(blocksSlugPageFile, "utf8");
    const createSource = fs.readFileSync(createPageFile, "utf8");
    const sharedThemeSource = fs.readFileSync(sharedThemePageFile, "utf8");

    expect(indexSource).toContain('data-page-scope="home"');
    expect(indexSource).toContain(':root:has([data-page-scope="home"]) .content-panel:first-child');

    expect(themesSource).toContain('data-page-scope="themes"');
    expect(themesSource).toContain(':root:has([data-page-scope="themes"]) .content-panel');

    expect(blocksIndexSource).toContain('data-page-scope="blocks-index"');
    expect(blocksIndexSource).toContain(':root:has([data-page-scope="blocks-index"]) .content-panel');

    expect(blocksSlugSource).toContain('data-page-scope="blocks-slug"');
    expect(blocksSlugSource).toContain(':root:has([data-page-scope="blocks-slug"]) .content-panel');

    expect(createSource).toContain('data-page-scope="create"');
    expect(createSource).toContain(':root:has([data-page-scope="create"]) .content-panel');

    const blogIndexSource = fs.readFileSync(blogIndexPageFile, "utf8");
    expect(blogIndexSource).toContain('data-page-scope="blog-index"');
    expect(blogIndexSource).toContain(':root:has([data-page-scope="blog-index"]) .sl-container');

    const blogSlugSource = fs.readFileSync(blogSlugPageFile, "utf8");
    expect(blogSlugSource).toContain('data-page-scope="blog-post"');
    expect(blogSlugSource).toContain(':root:has([data-page-scope="blog-post"]) .sl-container');

    expect(sharedThemeSource).not.toContain('data-page-scope="shared-theme"');
    expect(sharedThemeSource).not.toContain(".sl-bejamas-docs-title");
  });
});
