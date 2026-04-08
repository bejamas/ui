import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { isBlogPostPathname, resolveOgConfig } from "../../route-middleware";

const astroConfigFile = path.resolve(
  import.meta.dir,
  "../../../astro.config.mjs",
);
const contentConfigFile = path.resolve(
  import.meta.dir,
  "../../content.config.ts",
);
const blogIndexPageFile = path.resolve(
  import.meta.dir,
  "../../pages/blog/index.astro",
);
const blogSlugPageFile = path.resolve(
  import.meta.dir,
  "../../pages/blog/[slug].astro",
);
const blogBylineFile = path.resolve(
  import.meta.dir,
  "../../components/blog/BlogByline.astro",
);
const blogDraftBadgeFile = path.resolve(
  import.meta.dir,
  "../../components/blog/BlogDraftBadge.astro",
);
const firstPostFile = path.resolve(
  import.meta.dir,
  "../../content/blog/introducing-data-slot.mdx",
);
const interactiveUiPostFile = path.resolve(
  import.meta.dir,
  "../../content/blog/building-real-interactive-uis-with-bejamas-ui-and-data-slot.mdx",
);
const blogPreviewShellFile = path.resolve(
  import.meta.dir,
  "../../components/blog/BlogPreviewShell.astro",
);
const runtimeDemoFile = path.resolve(
  import.meta.dir,
  "../../components/blog/demos/RuntimeTabsDemo.astro",
);
const stimulusDemoFile = path.resolve(
  import.meta.dir,
  "../../components/blog/demos/StimulusStateBridgeDemo.astro",
);
const alpineDemoFile = path.resolve(
  import.meta.dir,
  "../../components/blog/demos/AlpineToggleGroupDemo.astro",
);
const blogStimulusBootstrapFile = path.resolve(
  import.meta.dir,
  "../../stimulus/blog.ts",
);
const blogStimulusControllerFile = path.resolve(
  import.meta.dir,
  "../../stimulus/controllers/blog_state_bridge_controller.ts",
);
const routeMiddlewareFile = path.resolve(
  import.meta.dir,
  "../../route-middleware.ts",
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
    expect(source).toContain("draft: z.boolean().default(false)");
    expect(source).toContain("publishDate: z.coerce.date()");
    expect(source).toContain("updatedDate: z.coerce.date().optional()");
    expect(source).toContain("authors: z.array(");
    expect(source).toContain("excerpt: z.string().optional()");
    expect(source).toContain("blog,");
  });

  test("loads and sorts blog entries on the index page", () => {
    const source = fs.readFileSync(blogIndexPageFile, "utf8");

    expect(source).toContain('getCollection("blog")');
    expect(source).toContain("filterVisibleBlogEntries");
    expect(source).toContain("shouldIncludeDraftBlogEntries");
    expect(source).toContain("includeDrafts: showDrafts");
    expect(source).toContain("sortBlogEntries");
    expect(source).toContain("getBlogHref");
  });

  test("statically renders blog posts and maps all authors in the byline", () => {
    const pageSource = fs.readFileSync(blogSlugPageFile, "utf8");
    const bylineSource = fs.readFileSync(blogBylineFile, "utf8");

    expect(pageSource).toContain("export const prerender = true;");
    expect(pageSource).toContain('getCollection("blog")');
    expect(pageSource).toContain("filterVisibleBlogEntries");
    expect(pageSource).toContain("shouldIncludeDraftBlogEntries");
    expect(pageSource).toContain("includeDrafts: showDrafts");
    expect(pageSource).toContain('getEntry("blog", slug)');
    expect(pageSource).toContain("await render(entry)");
    expect(pageSource).toContain("<BlogByline");

    expect(bylineSource).toContain("authors.map((author)");
    expect(pageSource).toContain("Published");
  });

  test("renders a visible draft badge and noindexes preview blog pages", () => {
    const indexSource = fs.readFileSync(blogIndexPageFile, "utf8");
    const pageSource = fs.readFileSync(blogSlugPageFile, "utf8");
    const badgeSource = fs.readFileSync(blogDraftBadgeFile, "utf8");
    const routeMiddlewareSource = fs.readFileSync(routeMiddlewareFile, "utf8");

    expect(indexSource).toContain("<BlogDraftBadge");
    expect(pageSource).toContain("<BlogDraftBadge");
    expect(badgeSource).toContain("Draft");
    expect(routeMiddlewareSource).toContain("shouldNoindexBlogPage(pathname)");
    expect(routeMiddlewareSource).toContain('"robots", "noindex, nofollow"');
  });

  test("seeds the first local MDX post with the planned metadata", () => {
    const source = fs.readFileSync(firstPostFile, "utf8");

    expect(source).toContain(
      'title: "How we handle interactive components in Astro without reaching for React"',
    );
    expect(source).toContain("publishDate: 2026-03-30");
    expect(source).toContain('name: "Mojtaba Seyedi"');
    expect(source).toContain("## The problem we were solving");
    expect(source).not.toContain(
      "possible, but heavy for small interactive primitives",
    );
  });

  test("seeds the interactive UI guide with the planned metadata and structure", () => {
    const source = fs.readFileSync(interactiveUiPostFile, "utf8");

    expect(source).toContain(
      'title: "How to build real interactive UIs with bejamas/ui and data-slot"',
    );
    expect(source).toContain("draft: true");
    expect(source).toContain("publishDate: 2026-04-04");
    expect(source).toContain('name: "Thom Krupa"');
    expect(source).toContain('name: "Mojtaba Seyedi"');
    expect(source).toContain("## The model");
    expect(source).toContain("## State ownership rules");
    expect(source).toContain(
      "## Demo 2: Stimulus for derived, multi-surface state",
    );
    expect(source).toContain("tabs:set");
    expect(source).toContain("select:set");
    expect(source).toContain("toggle:set");
  });

  test("imports blog demos directly into the interactive UI post", () => {
    const source = fs.readFileSync(interactiveUiPostFile, "utf8");

    expect(source).toContain(
      'import BlogPreviewShell from "@/components/blog/BlogPreviewShell.astro";',
    );
    expect(source).toContain(
      'import RuntimeTabsDemo from "@/components/blog/demos/RuntimeTabsDemo.astro";',
    );
    expect(source).toContain(
      'import StimulusStateBridgeDemo from "@/components/blog/demos/StimulusStateBridgeDemo.astro";',
    );
    expect(source).toContain(
      'import AlpineToggleGroupDemo from "@/components/blog/demos/AlpineToggleGroupDemo.astro";',
    );
  });

  test("uses the docs-style preview shell for blog demos", () => {
    const source = fs.readFileSync(blogPreviewShellFile, "utf8");

    expect(source).toContain("sl-bejamas-component-preview");
    expect(source).toContain("rounded-t-lg");
    expect(source).toContain("min-h-[24rem]");
    expect(source).toContain("width: min(72rem, calc(100vw - 2rem))");
  });

  test("marks blog post OG images as title-only without changing the blog index", () => {
    expect(isBlogPostPathname("/blog/introducing-data-slot")).toBe(true);
    expect(isBlogPostPathname("/blog")).toBe(false);
    expect(isBlogPostPathname("/blog/")).toBe(false);
    expect(isBlogPostPathname("/docs/introduction")).toBe(false);

    const blogPostConfig = resolveOgConfig({
      pathname: "/blog/introducing-data-slot",
      url: "https://ui.bejamas.com/blog/introducing-data-slot",
      entryTitle: "Title",
      entryDescription: "Description",
      siteTitle: "bejamas/ui",
    });
    const blogIndexConfig = resolveOgConfig({
      pathname: "/blog",
      url: "https://ui.bejamas.com/blog",
      entryTitle: "Blog",
      entryDescription: "Description",
      siteTitle: "bejamas/ui",
    });
    const docsConfig = resolveOgConfig({
      pathname: "/docs/introduction",
      url: "https://ui.bejamas.com/docs/introduction",
      entryTitle: "Docs",
      entryDescription: "Description",
      siteTitle: "bejamas/ui",
    });

    expect(blogPostConfig?.path).toBe("/api/og/text");
    expect(blogPostConfig?.params.get("hideDescription")).toBe("1");
    expect(blogIndexConfig?.params.has("hideDescription")).toBe(false);
    expect(docsConfig?.params.has("hideDescription")).toBe(false);
  });

  test("keeps the Stimulus demo isolated to the blog bootstrap", () => {
    const demoSource = fs.readFileSync(stimulusDemoFile, "utf8");
    const bootstrapSource = fs.readFileSync(blogStimulusBootstrapFile, "utf8");
    const controllerSource = fs.readFileSync(
      blogStimulusControllerFile,
      "utf8",
    );

    expect(demoSource).toContain('data-controller="blog-state-bridge"');
    expect(demoSource).toContain('import "@/stimulus/blog";');
    expect(bootstrapSource).toContain(
      'application.register("blog-state-bridge"',
    );
    expect(controllerSource).toContain("static values = {");
    expect(controllerSource).toContain("patternValueChanged");
    expect(controllerSource).toContain('new CustomEvent("select:set"');
  });

  test("keeps the Alpine demo focused on local reactive glue", () => {
    const source = fs.readFileSync(alpineDemoFile, "utf8");

    expect(source).toContain("x-data=");
    expect(source).toContain("x-on:toggle-group:change");
    expect(source).toContain("toggle-group:change");
  });

  test("ships a runtime-only demo that updates derived UI from tabs events", () => {
    const source = fs.readFileSync(runtimeDemoFile, "utf8");

    expect(source).toContain('id="blog-runtime-tabs-demo"');
    expect(source).toContain("tabs:change");
    expect(source).toContain('new CustomEvent("tabs:set"');
    expect(source).toContain('data-runtime-tabs-set="publish"');
  });
});
