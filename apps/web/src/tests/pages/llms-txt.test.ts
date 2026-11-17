import { describe, expect, test } from "bun:test";

import { GET as getLlmsFullTxt } from "../../pages/llms-full.txt";
import { GET as getLlmsTxt } from "../../pages/llms.txt";
import { transformMarkdown } from "../../utils/docsMarkdown";

const site = new URL("https://ui.bejamas.com");
const context = { site, url: site } as Parameters<typeof getLlmsTxt>[0];

describe("llms.txt", () => {
  test("indexes docs pages as absolute markdown links grouped by section", async () => {
    const response = await getLlmsTxt(context);
    const body = await response.text();

    expect(response.headers.get("Content-Type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(body.startsWith("# bejamas/ui\n\n> ")).toBe(true);
    expect(body).toContain("## Getting Started");
    expect(body).toContain("## Components");
    expect(body).toContain(
      "- [Select](https://ui.bejamas.com/components/select.md): ",
    );
    expect(body).toContain("https://ui.bejamas.com/llms-full.txt");
    expect(body.indexOf("docs/introduction.md")).toBeLessThan(
      body.indexOf("docs/installation.md"),
    );
  });

  test("leaves splash pages out of the index", async () => {
    const body = await (await getLlmsTxt(context)).text();

    expect(body).not.toContain("templates.md");
  });

  test("llms-full.txt concatenates every indexed page", async () => {
    const body = await (await getLlmsFullTxt(context)).text();

    expect(body).toContain("<!-- Source: https://ui.bejamas.com/components/select -->");
    expect(body).toContain("# Select");
    expect(body).toContain("# Introduction");
    expect(body).not.toContain("sl-bejamas-component-preview");
    expect(body).not.toContain("<DocsTabs");
  });
});

describe("transformMarkdown", () => {
  test("drops live previews and flattens package manager tabs", () => {
    const markdown = transformMarkdown(`---
title: "Example"
---
<div class="not-content sl-bejamas-component-preview flex">
<Button>Click</Button>
</div>

<DocsTabs syncKey="pkg">
  <DocsTabItem label="npm">
  \`\`\`bash
  npx bejamas add button
  \`\`\`
  </DocsTabItem>
</DocsTabs>
`);

    expect(markdown).not.toContain("<Button>Click</Button>");
    expect(markdown).not.toContain("DocsTab");
    expect(markdown).toContain("npm:\n\n```bash\nnpx bejamas add button\n```");
  });
});
