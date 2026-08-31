import { afterEach, describe, expect, mock, test } from "bun:test";

import { handleRequest } from "./index";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("domain bridge", () => {
  test("streams the request to the configured upstream with its path and query", async () => {
    const fetchMock = mock(async (request: Request) => {
      expect(request.url).toBe(
        "https://bejamas-ui.bejamas-oss.workers.dev/api/shuffles?limit=3",
      );
      expect(request.method).toBe("POST");
      expect(request.headers.get("X-Forwarded-Host")).toBe("ui.bejamas.com");
      expect(request.headers.get("X-Forwarded-Proto")).toBe("https");
      expect(await request.text()).toBe('{"component":"button"}');

      return new Response("proxied", { status: 201 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const response = await handleRequest(
      new Request("https://ui.bejamas.com/api/shuffles?limit=3", {
        method: "POST",
        body: '{"component":"button"}',
      }),
      { UPSTREAM_ORIGIN: "https://bejamas-ui.bejamas-oss.workers.dev" },
    );

    expect(response.status).toBe(201);
    expect(await response.text()).toBe("proxied");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("rewrites only redirects that point back to the upstream Worker", async () => {
    globalThis.fetch = mock(async () =>
      Response.redirect(
        "https://bejamas-ui.bejamas-oss.workers.dev/docs/getting-started",
        302,
      ),
    ) as unknown as typeof fetch;

    const response = await handleRequest(
      new Request("https://ui.bejamas.com/old-docs"),
      { UPSTREAM_ORIGIN: "https://bejamas-ui.bejamas-oss.workers.dev" },
    );

    expect(response.headers.get("Location")).toBe(
      "https://ui.bejamas.com/docs/getting-started",
    );
  });

  test("removes the upstream workers.dev noindex header on the public domain", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response("public", {
          headers: { "X-Robots-Tag": "noindex" },
        }),
    ) as unknown as typeof fetch;

    const response = await handleRequest(
      new Request("https://ui.bejamas.com/"),
      { UPSTREAM_ORIGIN: "https://bejamas-ui.bejamas-oss.workers.dev" },
    );

    expect(response.headers.has("X-Robots-Tag")).toBe(false);
  });

  test("keeps the noindex header on the bridge workers.dev preview", async () => {
    globalThis.fetch = mock(
      async () =>
        new Response("preview", {
          headers: { "X-Robots-Tag": "noindex" },
        }),
    ) as unknown as typeof fetch;

    const response = await handleRequest(
      new Request("https://bejamas-ui-domain-bridge.bejamas.workers.dev/"),
      { UPSTREAM_ORIGIN: "https://bejamas-ui.bejamas-oss.workers.dev" },
    );

    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  test("returns a non-cacheable 502 when the upstream is unavailable", async () => {
    globalThis.fetch = mock(async () => {
      throw new Error("network failure");
    }) as unknown as typeof fetch;

    const response = await handleRequest(
      new Request("https://ui.bejamas.com/api/shuffles"),
      {
        UPSTREAM_ORIGIN: "https://bejamas-ui.bejamas-oss.workers.dev",
      },
    );

    expect(response.status).toBe(502);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
