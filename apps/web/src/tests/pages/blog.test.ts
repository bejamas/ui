import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const astroConfigFile = path.resolve(
  import.meta.dir,
  "../../../astro.config.mjs",
);
const contentConfigFile = path.resolve(
  import.meta.dir,
  "../../content.config.ts",
);
const blogIndexPageFile = path.resolve(import.meta.dir, "../../pages/blog/index.astro");
const blogSlugPageFile = path.resolve(import.meta.dir, "../../pages/blog/[slug].astro");
const blogBylineFile = path.resolve(
  import.meta.dir,
  "../../components/blog/BlogByline.astro",
);
const firstPostFile = path.resolve(
  import.meta.dir,
  "../../content/blog/introducing-data-slot.mdx",
);

describe("blog source wiring", () => {
  test("adds blog to the main nav and keeps blog pages out of the dynamic route allowlist", () => {
    const source = fs.readFileSync(astroConfigFile, "utf8");

    expect(source).toContain('{ label: "Blog", href: "/blog" }');
    expect(source).not.toContain('"src/pages/blog/index.astro"');
    expect(source).not.toContain('"src/pages/blog/[slug].astro"');
  });

  test("registers a blog collection with multi-author frontmatter", () => {
    const source = fs.readFileSync(contentConfigFile, "utf8");

    expect(source).toContain("const blog = defineCollection({");
    expect(source).toContain("loader: glob({");
    expect(source).toContain('pattern: "**/*.{md,mdx}"');
    expect(source).toContain('base: "src/content/blog"');
    expect(source).toContain("publishDate: z.coerce.date()");
    expect(source).toContain("updatedDate: z.coerce.date().optional()");
    expect(source).toContain("authors: z.array(");
    expect(source).toContain("excerpt: z.string().optional()");
    expect(source).toContain("blog,");
  });

  test("loads and sorts blog entries on the index page", () => {
    const source = fs.readFileSync(blogIndexPageFile, "utf8");

    expect(source).toContain('getCollection("blog")');
    expect(source).toContain("sortBlogEntries");
    expect(source).toContain("getBlogHref");
  });

  test("statically renders blog posts and maps all authors in the byline", () => {
    const pageSource = fs.readFileSync(blogSlugPageFile, "utf8");
    const bylineSource = fs.readFileSync(blogBylineFile, "utf8");

    expect(pageSource).toContain("export const prerender = true;");
    expect(pageSource).toContain('getCollection("blog")');
    expect(pageSource).toContain('getEntry("blog", slug)');
    expect(pageSource).toContain("await render(entry)");
    expect(pageSource).toContain("<BlogByline");

    expect(bylineSource).toContain("authors.map((author)");
    expect(pageSource).toContain("Published");
  });

  test("seeds the first local MDX post with the planned metadata", () => {
    const source = fs.readFileSync(firstPostFile, "utf8");

    expect(source).toContain(
      'title: "How we handle interactive components in Astro without reaching for React"',
    );
    expect(source).toContain("publishDate: 2026-03-30");
    expect(source).toContain('name: "Mojtaba Seyedi"');
    expect(source).toContain("## The gap");
  });
});
