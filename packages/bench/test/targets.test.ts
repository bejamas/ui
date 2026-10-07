import { describe, expect, test } from "bun:test";
import {
  assessComparability,
  detectDevServer,
  isLocalHost,
  normalizeUrl,
  resolveTargetUrls,
} from "../src/targets";
import type { Target } from "../src/types";

describe("normalizeUrl", () => {
  test("adds http to local hosts and https to remote hosts", () => {
    expect(normalizeUrl("localhost:4321").href).toBe("http://localhost:4321/");
    expect(normalizeUrl("127.0.0.1:3000/about").href).toBe(
      "http://127.0.0.1:3000/about",
    );
    expect(normalizeUrl("example.com").href).toBe("https://example.com/");
  });

  test("keeps explicit schemes", () => {
    expect(normalizeUrl("http://example.com").href).toBe("http://example.com/");
    expect(normalizeUrl("https://localhost:4321").href).toBe(
      "https://localhost:4321/",
    );
  });

  test("rejects other protocols and empty input", () => {
    expect(() => normalizeUrl("ftp://example.com")).toThrow(
      "Only http and https",
    );
    expect(() => normalizeUrl(" ")).toThrow("A URL is required");
  });
});

test("isLocalHost recognises loopback, private and .localhost hosts", () => {
  for (const host of [
    "localhost",
    "app.localhost",
    "127.0.0.1",
    "[::1]",
    "10.0.0.5",
    "192.168.1.2",
    "172.20.0.1",
    "mac.local",
  ]) {
    expect(isLocalHost(host)).toBe(true);
  }
  for (const host of ["example.com", "172.32.0.1", "8.8.8.8"]) {
    expect(isLocalHost(host)).toBe(false);
  }
});

describe("detectDevServer", () => {
  test("detects Vite, Astro and Next.js development servers", () => {
    expect(
      detectDevServer('<script type="module" src="/@vite/client"></script>'),
    ).toBe("Vite");
    expect(
      detectDevServer(
        '<script src="/@vite/client"></script><script src="/@fs/app/node_modules/astro/dist/runtime/client/dev-toolbar/entrypoint.js?v=1"></script>',
      ),
    ).toBe("Astro");
    expect(
      detectDevServer(
        '<link href="/_next/static/chunks/%5Bturbopack%5D_browser_dev_hmr-client_hmr-client_ts_1._.js">',
      ),
    ).toBe("Next.js");
    expect(
      detectDevServer(
        '<script src="/_next/static/chunks/webpack.js?v=1712"></script>',
      ),
    ).toBe("Next.js");
  });

  test("does not flag production Turbopack output", () => {
    expect(
      detectDevServer(
        '<script src="/_next/static/chunks/turbopack-39h3jchm8onpd.js" async></script>',
      ),
    ).toBeNull();
  });
});

describe("assessComparability", () => {
  const target = (overrides: Partial<Target>): Target => ({
    side: "original",
    input: "",
    url: "",
    finalUrl: "",
    status: 200,
    local: true,
    devServer: null,
    ...overrides,
  });

  test("two local production builds are comparable", () => {
    expect(assessComparability(target({}), target({ side: "ported" }))).toEqual(
      { comparable: true, reasons: [] },
    );
  });

  test("local vs remote and dev servers are not comparable", () => {
    const result = assessComparability(
      target({ local: false }),
      target({ side: "ported", devServer: "Astro" }),
    );
    expect(result.comparable).toBe(false);
    expect(result.reasons).toHaveLength(2);
    expect(result.reasons[0]).toContain("original URL is remote");
    expect(result.reasons[1]).toContain("development server (Astro)");
  });
});

describe("resolveTargetUrls", () => {
  test("uses the named flags without a warning", () => {
    expect(
      resolveTargetUrls({ original: "a.test", ported: "b.test" }, []),
    ).toEqual({
      original: "a.test",
      ported: "b.test",
    });
  });

  test("accepts two positional URLs with a warning naming each side", () => {
    const result = resolveTargetUrls({}, ["a.test", "b.test"]);
    expect(result).toMatchObject({ original: "a.test", ported: "b.test" });
    expect(result.warning).toBe(
      "Reading a.test as the original and b.test as the port. Use --original and --ported to avoid swapping them.",
    );
  });

  test("rejects mixed, partial and miscounted input", () => {
    expect(() =>
      resolveTargetUrls({ original: "a.test", ported: "b.test" }, ["c.test"]),
    ).toThrow("not both (got c.test)");
    expect(() => resolveTargetUrls({ original: "a.test" }, [])).toThrow(
      "Missing --ported <url>.",
    );
    expect(() => resolveTargetUrls({ ported: "b.test" }, [])).toThrow(
      "Missing --original <url>.",
    );
    expect(() => resolveTargetUrls({}, [])).toThrow("Pass both URLs");
    expect(() => resolveTargetUrls({}, ["a.test", "b.test", "c.test"])).toThrow(
      "Pass both URLs",
    );
  });
});
