import { describe, expect, test } from "bun:test";

import { GET, getStaticPaths } from "../../pages/[...page].md";
import { transformMarkdown } from "../../utils/docsMarkdown";

describe("docs markdown export", () => {
  test("prerenders markdown routes for known docs pages", () => {
    const paths = getStaticPaths();

    expect(paths.some((path) => path.params.page === "docs/cli")).toBe(true);
    expect(paths.some((path) => path.params.page === "docs/introduction")).toBe(
      true,
    );
  });

  test("returns markdown for known docs routes", async () => {
    const response = await GET({
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
    const response = await GET({
      params: { page: "docs/does-not-exist" },
    });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
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
