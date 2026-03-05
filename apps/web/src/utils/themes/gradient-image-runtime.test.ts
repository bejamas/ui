// @ts-nocheck
import { describe, expect, it } from "bun:test";

import {
  rewriteGradientImageUrl,
  rewriteGradientSrcset,
} from "./gradient-image-runtime";

describe("rewriteGradientImageUrl", () => {
  it("rewrites direct gradient URLs", () => {
    const next = rewriteGradientImageUrl(
      "https://gradient.bejamas.com/api/gradient.png?seed=bejamas&mode=light",
      { themeKey: "tokyo", mode: "dark", color: "#ff00aa" },
    );

    const url = new URL(next);
    expect(url.hostname).toBe("gradient.bejamas.com");
    expect(url.searchParams.get("theme")).toBe("tokyo");
    expect(url.searchParams.get("mode")).toBe("dark");
    expect(url.searchParams.get("color")).toBe("#ff00aa");
    expect(url.searchParams.get("seed")).toBe("bejamas");
  });

  it("rewrites nested URLs in /_vercel/image and keeps optimizer params", () => {
    const next = rewriteGradientImageUrl(
      "/_vercel/image?url=https%3A%2F%2Fgradient.bejamas.com%2Fapi%2Fgradient.png%3Fseed%3Dbejamas%26theme%3Dold%26mode%3Dlight%26color%3D%2523000000&w=640&q=100",
      { themeKey: "new-theme", mode: "dark", color: "#14b8a6" },
    );

    const outer = new URL(next, "https://ui.bejamas.com");
    const inner = new URL(outer.searchParams.get("url")!);

    expect(outer.pathname).toBe("/_vercel/image");
    expect(outer.searchParams.get("w")).toBe("640");
    expect(outer.searchParams.get("q")).toBe("100");
    expect(inner.hostname).toBe("gradient.bejamas.com");
    expect(inner.searchParams.get("theme")).toBe("new-theme");
    expect(inner.searchParams.get("mode")).toBe("dark");
    expect(inner.searchParams.get("color")).toBe("#14b8a6");
    expect(inner.searchParams.get("seed")).toBe("bejamas");
  });

  it("rewrites nested URLs in /_image", () => {
    const next = rewriteGradientImageUrl(
      "/_image?url=https%3A%2F%2Fgradient.bejamas.com%2Fapi%2Fgradient.png%3Fseed%3Dbejamas&w=512",
      { themeKey: "rome", mode: "light", color: "oklch(0.7 0.2 40)" },
    );

    const outer = new URL(next, "https://ui.bejamas.com");
    const inner = new URL(outer.searchParams.get("url")!);

    expect(outer.pathname).toBe("/_image");
    expect(inner.searchParams.get("theme")).toBe("rome");
    expect(inner.searchParams.get("mode")).toBe("light");
    expect(inner.searchParams.get("color")).toBe("#ff6728");
  });

  it("leaves non-gradient URLs unchanged", () => {
    const input = "https://github.com/withastro.png";
    const next = rewriteGradientImageUrl(input, {
      themeKey: "anything",
      mode: "dark",
    });

    expect(next).toBe(input);
  });
});

describe("rewriteGradientSrcset", () => {
  it("rewrites gradient entries and keeps descriptors", () => {
    const input =
      "https://gradient.bejamas.com/api/gradient.png?seed=one 1x, https://example.com/a.png 2x";

    const next = rewriteGradientSrcset(input, {
      themeKey: "berlin",
      mode: "dark",
      color: "#123456",
    });

    const [first, second] = next.split(",").map((entry) => entry.trim());
    const [firstUrl, firstDescriptor] = first.split(/\s+/);
    const [secondUrl, secondDescriptor] = second.split(/\s+/);

    expect(firstDescriptor).toBe("1x");
    expect(secondDescriptor).toBe("2x");

    const url = new URL(firstUrl);
    expect(url.hostname).toBe("gradient.bejamas.com");
    expect(url.searchParams.get("theme")).toBe("berlin");
    expect(url.searchParams.get("mode")).toBe("dark");
    expect(url.searchParams.get("color")).toBe("#123456");

    expect(secondUrl).toBe("https://example.com/a.png");
  });
});
