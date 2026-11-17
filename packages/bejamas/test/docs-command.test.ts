import { describe, expect, test } from "bun:test";

import { fetchComponentDocs } from "@/src/commands/docs";

function fakeFetch(status: number, body = "") {
  const calls: string[] = [];
  const impl = (async (input: string | URL | Request) => {
    calls.push(String(input));
    return new Response(body, { status });
  }) as typeof fetch;

  return { calls, impl };
}

describe("bejamas docs", () => {
  test("fetches the component's markdown page from the bejamas/ui site", async () => {
    const { calls, impl } = fakeFetch(200, "# Select\n\nPick one option.");
    const result = await fetchComponentDocs("Select", {
      env: {},
      fetchImpl: impl,
    });

    expect(calls).toEqual(["https://ui.bejamas.com/components/select.md"]);
    expect(result).toEqual({
      component: "select",
      links: {
        docs: "https://ui.bejamas.com/components/select",
        markdown: "https://ui.bejamas.com/components/select.md",
      },
      content: "# Select\n\nPick one option.",
    });
  });

  test("accepts namespaced names and honours BEJAMAS_UI_URL", async () => {
    const { calls, impl } = fakeFetch(200, "# Tabs");

    await fetchComponentDocs("@bejamas/tabs", {
      env: { BEJAMAS_UI_URL: "http://localhost:4321/" },
      fetchImpl: impl,
    });

    expect(calls).toEqual(["http://localhost:4321/components/tabs.md"]);
  });

  test("reports unknown components with a pointer to llms.txt", async () => {
    const { impl } = fakeFetch(404);
    const result = await fetchComponentDocs("nope", { env: {}, fetchImpl: impl });

    expect(result.content).toBeUndefined();
    expect(result.error).toContain('No docs found for "nope"');
    expect(result.error).toContain("https://ui.bejamas.com/llms.txt");
  });
});
