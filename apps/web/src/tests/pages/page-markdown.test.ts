import { describe, expect, test } from "bun:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { GET, getStaticPaths } from "../../pages/[...page].md";
import { resolveDocsRoot, transformMarkdown } from "../../utils/docsMarkdown";

describe("docs markdown export", () => {
  test("prerenders markdown routes for known docs pages", () => {
    const paths = getStaticPaths();

    expect(paths.some((path) => path.params.page === "docs/cli")).toBe(true);
    expect(paths.some((path) => path.params.page === "docs/introduction")).toBe(
      true,
    );
  });

  test("returns markdown for known docs routes", async () => {
    const response = GET({
      params: { page: "docs/cli" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );

    const body = await response.text();
    expect(body.startsWith("# CLI")).toBe(true);
    expect(body).toContain("The `bejamas` CLI is a thin Astro-first wrapper");
  });

  test("returns 404 for unknown docs routes", async () => {
    const response = GET({
      params: { page: "docs/does-not-exist" },
    });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  });

  test("resolves docs content from the app cwd when running from built server output", () => {
    const appRoot = fileURLToPath(new URL("../../../", import.meta.url));
    const builtModuleUrl = new URL(
      "../../../dist/server/.prerender/chunks/docsMarkdown.fake.mjs",
      import.meta.url,
    ).href;

    expect(
      resolveDocsRoot({
        importMetaUrl: builtModuleUrl,
        cwd: appRoot,
      }),
    ).toBe(path.join(appRoot, "src/content/docs"));
  });

  test("strips frontmatter imports and link-card markup when transforming markdown", () => {
    const markdown = transformMarkdown(`---
title: "Example"
---
import LinkCard from "./LinkCard.astro";

<Steps>
One
</Steps>

<LinkCard title="Theme docs" href="/docs/theming" />
{% linkcard title="Blocks" href="/blocks" /%}
`);

    expect(markdown).toContain("# Example");
    expect(markdown).not.toContain("import LinkCard");
    expect(markdown).not.toContain("<Steps>");
    expect(markdown).toContain("[Theme docs](/docs/theming)");
    expect(markdown).toContain("[Blocks](/blocks)");
  });
});
