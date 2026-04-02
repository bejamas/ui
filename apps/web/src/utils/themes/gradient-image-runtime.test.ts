// @ts-nocheck
import { describe, expect, it } from "bun:test";
import { encodePreset } from "@bejamas/create-config/browser";

import {
  resolveGradientThemeFromPresetId,
  rewriteGradientImageUrl,
  rewriteGradientSrcset,
} from "./gradient-image-runtime";

describe("resolveGradientThemeFromPresetId", () => {
  it("decodes built-in theme ids from preset codes", () => {
    const preset = encodePreset({
      style: "juno",
      baseColor: "neutral",
      theme: "bejamas-blue",
      iconLibrary: "lucide",
      font: "geist",
      fontHeading: "inherit",
      radius: "default",
      menuColor: "default",
      menuAccent: "subtle",
    });

    expect(resolveGradientThemeFromPresetId(preset)).toBe("bejamas-blue");
    expect(resolveGradientThemeFromPresetId("default")).toBeNull();
  });
});

describe("rewriteGradientImageUrl", () => {
  it("rewrites direct gradient URLs to bejamas preset images", () => {
    const next = rewriteGradientImageUrl(
      "https://gradient.bejamas.com/api/gradient.png?seed=bejamas&mode=light",
      { theme: "bejamas-blue" },
    );

    expect(next).toBe(
      "https://gradient.bejamas.com/presets/bejamas/marine.png",
    );
  });

  it("rewrites nested URLs in /_vercel/image and keeps optimizer params", () => {
    const next = rewriteGradientImageUrl(
      "/_vercel/image?url=https%3A%2F%2Fgradient.bejamas.com%2Fapi%2Fgradient.png%3Fseed%3Dbejamas%26theme%3Dold&w=640&q=100",
      { theme: "amber" },
    );

    const outer = new URL(next, "https://ui.bejamas.com");
    const inner = new URL(outer.searchParams.get("url")!);

    expect(outer.pathname).toBe("/_vercel/image");
    expect(outer.searchParams.get("w")).toBe("640");
    expect(outer.searchParams.get("q")).toBe("100");
    expect(inner.toString()).toBe(
      "https://gradient.bejamas.com/presets/tailwind/amber.png",
    );
  });

  it("rewrites nested URLs in /_image", () => {
    const next = rewriteGradientImageUrl(
      "/_image?url=https%3A%2F%2Fgradient.bejamas.com%2Fpresets%2Fbejamas%2Fmarine.png&w=512",
      { theme: "amber" },
    );

    const outer = new URL(next, "https://ui.bejamas.com");
    const inner = new URL(outer.searchParams.get("url")!);

    expect(outer.pathname).toBe("/_image");
    expect(inner.toString()).toBe(
      "https://gradient.bejamas.com/presets/tailwind/amber.png",
    );
  });

  it("rewrites Astro image optimizer URLs that use href", () => {
    const next = rewriteGradientImageUrl(
      "/_image?href=https%3A%2F%2Fgradient.bejamas.com%2Fpresets%2Fbejamas%2Fmarine.png&w=640&q=100",
      { theme: "amber" },
    );

    const outer = new URL(next, "https://ui.bejamas.com");
    const inner = new URL(outer.searchParams.get("href")!);

    expect(outer.pathname).toBe("/_image");
    expect(outer.searchParams.get("w")).toBe("640");
    expect(outer.searchParams.get("q")).toBe("100");
    expect(inner.toString()).toBe(
      "https://gradient.bejamas.com/presets/tailwind/amber.png",
    );
  });

  it("leaves non-gradient URLs unchanged", () => {
    const input = "https://github.com/withastro.png";
    const next = rewriteGradientImageUrl(input, { theme: "bejamas-blue" });

    expect(next).toBe(input);
  });

  it("leaves gradient URLs unchanged for unresolved themes", () => {
    const input = "https://gradient.bejamas.com/presets/bejamas/marine.png";
    const next = rewriteGradientImageUrl(input, { theme: "custom-theme-42" });

    expect(next).toBe(input);
  });
});

describe("rewriteGradientSrcset", () => {
  it("rewrites gradient entries and keeps descriptors", () => {
    const input =
      "https://gradient.bejamas.com/api/gradient.png?seed=one 1x, https://example.com/a.png 2x";

    const next = rewriteGradientSrcset(input, {
      theme: "amber",
    });

    const [first, second] = next.split(",").map((entry) => entry.trim());
    const [firstUrl, firstDescriptor] = first.split(/\s+/);
    const [secondUrl, secondDescriptor] = second.split(/\s+/);

    expect(firstDescriptor).toBe("1x");
    expect(secondDescriptor).toBe("2x");
    expect(firstUrl).toBe(
      "https://gradient.bejamas.com/presets/tailwind/amber.png",
    );
    expect(secondUrl).toBe("https://example.com/a.png");
  });
});
